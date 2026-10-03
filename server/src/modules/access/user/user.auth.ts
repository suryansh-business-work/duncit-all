/**
 * `userService` — sign-up and sign-in: password, OTP and social (Google/Apple)
 * login, account linking and social sign-up. Composed into `userService` in
 * user.service.ts.
 */
import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { UserModel } from './user.model';
import { UserRoleModel } from './relations';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import {
  CHANNEL_MEDIUMS,
  accountFor,
  notRegistered,
  targetOf,
  type PasswordResetLookup,
  type PasswordResetRequestResult,
} from '@modules/access/auth/password-reset.service';
import { anyDelivered, otpService } from '@modules/platform/otp/otp.service';
import { whatsappAuthService } from '@modules/access/auth-whatsapp/auth-whatsapp.service';
import { OTP_TTL_MINUTES } from '@modules/platform/otp/otp.constants';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';
import type {
  LoginDTO,
  RegisterDTO,
  GoogleSignupDTO,
  AppleSignupDTO,
} from '@modules/access/auth/auth.validator';
import type {
  PolicyAcceptanceIntent,
} from '@modules/content/policyAcceptance/policyAcceptance.model';
import { verifyGoogleIdToken } from '@modules/access/auth/auth.google';
import {
  SOCIAL_PROVIDERS,
  socialAccountNotFound,
  type SocialIdentity,
  type SocialProvider,
  type SocialProviderSpec,
} from '@modules/access/auth/auth.social';
import { assertPortalLogin } from '@modules/portals';
import { noteSignIn, type SignInContext } from './user.signin';
import { authPayload } from './user.public';
import { twoFactorService } from '@modules/access/auth/two-factor/two-factor.service';
import { applySignupMarketingChoice } from '@modules/access/privacy/privacy.service';
import type { IdLike } from '@utils/request-cache';
import {
  isPlaceholderPhone,
  nextFreeUsername,
  recordSignupAcceptance,
  registerDuplicateError,
  shapeUserDoc,
  welcomeNewAccount,
} from './user.accounts';

/**
 * Map a user document to what Profile > Connected Accounts renders.
 *
 * The document MUST have been loaded with CONNECTED_FIELDS — the hash is
 * `select: false`, and `has_password` silently reads false without it, which
 * would tell a password-holder that Google is their only way in and hide the
 * Disconnect action from them.
 */
function connectedAccountsOf(u: any) {
  const auth = u?.auth ?? {};
  const linked = !!auth.google_id;
  return {
    email: auth.email ?? null,
    has_password: !!auth.password,
    google: linked
      ? {
          // Google-signup accounts predate `google_email`; theirs is the address
          // they signed up with.
          google_email: auth.google_email ?? auth.email ?? '',
          linked_at: auth.google_linked_at?.toISOString?.() ?? null,
        }
      : null,
    password_changed_at: u?.security?.password_changed_at?.toISOString?.() ?? null,
    last_login_at: auth.last_login_at?.toISOString?.() ?? null,
    last_login_provider: auth.last_login_provider ?? null,
    two_factor_enabled: !!u?.security?.two_factor_enabled,
    two_factor_enabled_at: u?.security?.two_factor_enabled_at?.toISOString?.() ?? null,
    two_factor_recovery_codes_left: u?.security?.two_factor_recovery_code_hashes?.length ?? 0,
  };
}

/** What `connectedAccountsOf` reads that is select:false. */
const CONNECTED_FIELDS = '+auth.password +security.two_factor_recovery_code_hashes';

/**
 * The name a provider signup is created under.
 *
 * Apple never puts the name in its token — the client is handed it once and
 * sends it, or asks for it — so a name the caller sent wins. Google's token
 * names the person, and the fallbacks behind it keep an account nameable when
 * it does not.
 */
function socialSignupName(
  spec: SocialProviderSpec,
  info: SocialIdentity,
  input: { first_name?: string; last_name?: string }
): { first: string; last: string } {
  const sentFirst = input.first_name?.trim();
  if (sentFirst) return { first: sentFirst, last: input.last_name?.trim() ?? '' };
  return {
    first: info.given_name || info.name?.split(' ')[0] || spec.label,
    last: info.family_name || info.name?.split(' ').slice(1).join(' ') || 'User',
  };
}

/** Map an error raised by a provider signup transaction onto the error to rethrow. */
function socialSignupError(e: any): any {
  if (e instanceof GraphQLError) return e;
  if (e?.code !== 11000) return e;
  const key = Object.keys(e?.keyPattern ?? {})[0] ?? '';
  if (key.includes('phone')) {
    return new GraphQLError(
      'This phone number is already registered. Please use a different number or login.',
      { extensions: { code: 'CONFLICT' } }
    );
  }
  if (key.includes('email') || key.includes('google') || key.includes('apple')) {
    return new GraphQLError('Account already exists. Please login instead.', {
      extensions: { code: 'CONFLICT' },
    });
  }
  return new GraphQLError('Account already exists', { extensions: { code: 'CONFLICT' } });
}

/**
 * The ONE refusal every failed email sign-in gets.
 *
 * Wrong address, wrong password, or an account sealed because its owner asked
 * to be deleted — all three answer with this exact error. That is the whole
 * point: a caller who can tell "no such account" from "that account is on its
 * way out" has been handed a way to test whether somebody is leaving Duncit,
 * off nothing but their email address.
 */
function invalidCredentials(): GraphQLError {
  return new GraphQLError('Invalid email or password', {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}

/**
 * Refuse a sign-in for an account whose owner asked for it to be deleted.
 *
 * Called at every door that mints a token, and always AFTER the credential
 * itself has been checked. Ordering matters: checked first, a sealed account
 * would answer before bcrypt had run and the difference in timing would be the
 * leak the shared message exists to close.
 */
function assertNotSealed(userId: IdLike): void {
  if (isAccountLocked(String(userId ?? ''))) throw invalidCredentials();
}

export const userAuthMethods = {
  async register(input: RegisterDTO, acceptance?: PolicyAcceptanceIntent) {
    if (isPlaceholderPhone(input.phone_number)) {
      throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const existing = await UserModel.findOne({ 'auth.email': input.email });
    if (existing) {
      throw new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
    }
    /*
      Signup always carries a number, so this always runs. It looks at BOTH
      fields a number can live in: the tick box decides which one it is written
      to, and a number that is somebody's WhatsApp number is just as taken as
      one that is their mobile — `accountFor` matches either, so letting two
      accounts share one would leave the phone doors picking between them.

      It is still a friendlier read of the rule the unique index enforces on
      auth.phone; registerDuplicateError catches the race that gets past here.
    */
    const phoneExists = await UserModel.findOne({
      $or: [
        { 'auth.phone.number': input.phone_number, 'auth.phone.extension': input.phone_extension },
        {
          'communication.whatsapp.number': input.phone_number,
          'communication.whatsapp.extension': input.phone_extension,
        },
      ],
    });
    if (phoneExists) {
      throw new GraphQLError(
        'This phone number is already registered. Please use a different number or login.',
        { extensions: { code: 'CONFLICT' } }
      );
    }
    /*
      The number has to have answered before any of this exists.

      Redeemed here rather than checked on a later screen: an account created
      first and verified afterwards is an account that survives every way of
      leaving that screen, which is exactly what this door used to do. Spent
      immediately after — single use is what stops one proof opening two
      accounts, and it has to be true before anything is written.
    */
    const proof = await whatsappAuthService.redeemSignupProof(
      input.whatsapp_token,
      input.phone_extension,
      input.phone_number
    );
    await whatsappAuthService.spendSignupProof(proof);

    const hashed = await bcrypt.hash(input.password, 10);
    let created: any;
    try {
      const username = await nextFreeUsername(input.first_name, input.last_name);
      /*
        The number the form collects is the WhatsApp one — that is what its
        label says and what the code just proved — so it is always recorded
        there, verified. Whether it is ALSO the mobile number is the tick box's
        answer, and the only thing that writes auth.phone: unticked, the profile
        phone stays blank rather than being guessed from a number the person
        said was different.
      */
      const alsoMobile = input.whatsapp_is_mobile !== false;
      const doc = {
        ...shapeUserDoc(
          { ...input, phone_number: alsoMobile ? input.phone_number : '' },
          { passwordHash: hashed, username, phoneVerified: alsoMobile }
        ),
        communication: {
          whatsapp: {
            extension: input.phone_extension,
            number: input.phone_number,
            verified_at: new Date(),
          },
        },
      };
      created = await UserModel.create(doc);
      await UserRoleModel.create({
        user_id: created._id,
        role: 'USER',
        scope: { city: null, zone: null },
      });
    } catch (e: any) {
      if (e?.code === 11000) throw registerDuplicateError(e);
      throw e;
    }

    await welcomeNewAccount(created, 'register');
    await recordSignupAcceptance(created, 'SIGNUP_FORM', acceptance);
    await applySignupMarketingChoice(created, acceptance?.marketing_opt_in === true);
    await userAuditService.recordCreate(String(created._id), created);
    return authPayload(created);
  },

  async login(input: LoginDTO, signIn?: SignInContext) {
    /*
      The SAME account lookup recovery and Continue with OTP use, so the three
      doors cannot disagree about which account a phone number belongs to — a
      number matches whether it is the one the account signed up with or the
      WhatsApp one it added later (rule 34). EMAIL is the default channel, so a
      caller that sends only an address takes exactly the path it always did.
    */
    const user = await accountFor(
      targetOf({
        channel: input.channel ?? 'EMAIL',
        email: input.email,
        phone_extension: input.phone_extension,
        phone_number: input.phone_number,
      })
    );
    if (!user) throw invalidCredentials();
    const stored = (user as any).auth?.password as string | undefined;
    if (!stored) {
      throw new GraphQLError('This account uses Google sign-in. Continue with Google.', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const ok = await bcrypt.compare(input.password, stored);
    if (!ok) throw invalidCredentials();
    // Right credentials are not enough once the owner has asked to be removed:
    // the account is on its way out and hands out no more sessions. The refusal
    // is the same one a wrong password gets, on purpose.
    assertNotSealed(user._id);
    if ((user as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    // A console sign-in with an authenticator app on stops here and asks for
    // the code; nothing below — the last-login stamp, the token — happens yet.
    await twoFactorService.requireForPortal(user, { provider: 'EMAIL', portalKey: input.portal_key });
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.last_login_provider': 'EMAIL',
          'auth.last_login_at': new Date(),
        },
      }
    );
    const fresh = await UserModel.findById(user._id).select('+auth.password');
    const payload = await authPayload(fresh);
    // Console portals: correct credentials are not enough — the account must
    // also hold a role the admin has granted for the requesting portal.
    assertPortalLogin(input.portal_key, payload.user.roles);
    // AFTER the portal check, so a sign-in that is about to be refused does not
    // tell somebody their account was signed in to. Not awaited: the notice is
    // best-effort and a mailbox must never hold up a login.
    noteSignIn(fresh as any, signIn ?? {}).catch(() => undefined);
    return payload;
  },

  /**
   * Continue with OTP, step one: find the account and send it a sign-in code.
   *
   * The lookup, the channels and the answer shape are the password-recovery
   * flow's — same helpers, same one-time-code service, a different PURPOSE so
   * the two kinds of code can never be spent on each other. One deliberate
   * difference: recovery refuses an account with no password (there is nothing
   * to recover), while a code can sign anyone in — a Google-only account
   * proving its mailbox is exactly as authenticated as it is pressing the
   * Google button.
   */
  async requestLoginOtp(input: PasswordResetLookup): Promise<PasswordResetRequestResult> {
    const target = targetOf(input);
    const user = await accountFor(target);
    // A sealed account reads as unregistered, exactly as recovery answers: the
    // account is on its way out, and a code could only open a door every other
    // gate already refuses.
    if (!user || isAccountLocked(String(user._id))) {
      return notRegistered(input.channel);
    }

    const issued = await otpService.request({
      purpose: 'LOGIN',
      mediums: CHANNEL_MEDIUMS[input.channel],
      ...target,
      recipient_name: user.profile?.first_name ?? '',
      // Whose session a correct code opens — resolved once, here, rather than
      // looked up again from a value the caller could change between steps.
      context: { user_id: String(user._id) },
      requested_by: String(user._id),
    });

    return {
      ok: true,
      registered: true,
      channel: input.channel,
      expires_at: issued.expires_at,
      resend_after_seconds: issued.resend_after_seconds,
      expires_in_minutes: OTP_TTL_MINUTES,
      sent: anyDelivered(issued.deliveries),
      test_code: issued.test_code,
    };
  },

  /** Continue with OTP, step two: trade a correct code for a session. */
  async loginWithOtp(
    input: PasswordResetLookup & { otp: string },
    signIn?: SignInContext
  ): Promise<{ token: string; user: any }> {
    const challenge = await otpService.verifyLatest('LOGIN', targetOf(input), input.otp);
    const userId = String((challenge.context as { user_id?: string })?.user_id ?? '');
    // A challenge naming no account is refused like any unknown one — findById('') would throw a CastError.
    const user = isValidObjectId(userId) ? await UserModel.findById(userId) : null;
    if (!user) throw invalidCredentials();
    // The same order the password door uses: proof first, then whether this
    // account may still hold a session at all.
    assertNotSealed(user._id);
    if ((user as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    // Spent only by a login that is actually happening — a refusal above
    // leaves the proof intact, and single use is what stops one code from
    // opening two sessions.
    await otpService.consume(String(challenge._id), { purpose: 'LOGIN' });

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { 'auth.last_login_provider': 'OTP', 'auth.last_login_at': new Date() } }
    );
    const fresh = await UserModel.findById(user._id);
    const payload = await authPayload(fresh);
    noteSignIn(fresh as any, signIn ?? {}).catch(() => undefined);
    return payload;
  },

  async loginWithGoogle(idToken: string, portalKey?: string | null, signIn?: SignInContext) {
    return this.loginWithSocial('GOOGLE', idToken, portalKey, signIn);
  },

  async loginWithApple(idToken: string, portalKey?: string | null, signIn?: SignInContext) {
    return this.loginWithSocial('APPLE', idToken, portalKey, signIn);
  },

  /**
   * Sign in with a provider credential — Google or Apple, the same door.
   *
   * Three answers besides a session: the identity is linked to nobody but its
   * verified address holds an email/password account (EMAIL_LOGIN_REQUIRED —
   * the client offers to link), it is linked to nobody at all (the provider's
   * not-found code — the client offers signup), or the account is not active.
   */
  async loginWithSocial(
    provider: SocialProvider,
    idToken: string,
    portalKey?: string | null,
    signIn?: SignInContext
  ) {
    const spec = SOCIAL_PROVIDERS[provider];
    const info = await spec.verify(idToken);
    const email = info.email;
    const user = await UserModel.findOne({ [spec.idPath]: info.sub });
    if (!user) {
      const emailUser = await UserModel.findOne({ 'auth.email': email }).select('+auth.password');
      // A sealed account is not offered the link either — "you registered with
      // email" would confirm it exists, which is the one thing the refusal
      // below is careful not to say.
      if (emailUser && (emailUser as any).auth?.password && !isAccountLocked(String(emailUser._id))) {
        // Not a dead end any more: the caller has proved control of a provider
        // account whose email the provider verified and which matches this
        // account, so linking is offered. The client shows the consent step
        // and, on "allow", calls the link mutation with this same id_token.
        // `email` is echoed back so the consent screen can name the account —
        // it is the address the caller just authenticated with, so it reveals
        // nothing they did not supply.
        throw new GraphQLError('Please login with email. You registered using email and password.', {
          extensions: { code: 'EMAIL_LOGIN_REQUIRED', email },
        });
      }
      throw socialAccountNotFound(provider, email);
    }
    /*
      A sealed account answers as if it had never existed here.

      Not `invalidCredentials()`: there is no password in this flow, so "invalid
      email or password" would itself be a tell. The refusal a provider account
      Duncit does not know gets is the one that reveals nothing.
    */
    if (isAccountLocked(String(user._id))) {
      throw socialAccountNotFound(provider, email);
    }
    if ((user as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    await twoFactorService.requireForPortal(user, { provider, portalKey });
    const set: Record<string, any> = {
      'auth.last_login_provider': provider,
      'auth.last_login_at': new Date(),
    };
    if (!user.auth?.is_email_verified) set['auth.is_email_verified'] = true;
    if (!user.profile?.profile_photo && info.picture) set['profile.profile_photo'] = info.picture;
    await UserModel.updateOne({ _id: user._id }, { $set: set });
    const fresh = await UserModel.findById(user._id);
    const payload = await authPayload(fresh);
    assertPortalLogin(portalKey, payload.user.roles);
    noteSignIn(fresh as any, signIn ?? {}).catch(() => undefined);
    return payload;
  },

  async linkGoogleAccount(idToken: string, portalKey?: string | null) {
    return this.linkSocialAccount('GOOGLE', idToken, portalKey);
  },

  async linkAppleAccount(idToken: string, portalKey?: string | null) {
    return this.linkSocialAccount('APPLE', idToken, portalKey);
  },

  /**
   * The "allow" half of the login consent step.
   *
   * Unauthenticated on purpose: every provider's verify refuses a token whose
   * email the provider has not verified, so a verified address that matches an
   * account IS proof of control — the same proof `loginWithSocial` accepts for
   * an already-linked account. What the consent step adds is INTENT, which the
   * client collects before calling this.
   *
   * The password is never read or written: the account ends up with both ways
   * in, which is the whole point.
   */
  async linkSocialAccount(provider: SocialProvider, idToken: string, portalKey?: string | null) {
    const spec = SOCIAL_PROVIDERS[provider];
    const info = await spec.verify(idToken);
    const email = info.email;

    // Already linked to this identity — treat as a plain login so a double-tap
    // on "Allow" (or a retry after a dropped response) signs in instead of
    // failing on the uniqueness guard below.
    const alreadyLinked = await UserModel.findOne({ [spec.idPath]: info.sub });
    if (alreadyLinked) {
      return this.loginWithSocial(provider, idToken, portalKey);
    }

    const user = await UserModel.findOne({ 'auth.email': email }).select('+auth.password');
    // A sealed account is answered as an unknown one, for the same reason as in
    // loginWithSocial — and because linking would otherwise mint a session for
    // an account that is on its way out.
    if (!user || isAccountLocked(String(user._id))) {
      throw socialAccountNotFound(provider, email);
    }
    if ((user as any).metadata?.status !== 'ACTIVE') {
      throw new GraphQLError('Account is not active', { extensions: { code: 'FORBIDDEN' } });
    }
    if (user.get(spec.idPath)) {
      throw new GraphQLError(spec.alreadyLinked, { extensions: { code: 'CONFLICT' } });
    }

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          [spec.idPath]: info.sub,
          [spec.emailPath]: email,
          [spec.linkedAtPath]: new Date(),
          // The provider vouched for this address, which is the same address
          // the account holds — so it is verified whether or not we had asked.
          'auth.is_email_verified': true,
          'auth.last_login_provider': provider,
          'auth.last_login_at': new Date(),
          ...(user.profile?.profile_photo || !info.picture
            ? {}
            : { 'profile.profile_photo': info.picture }),
        },
      }
    );
    const fresh = await UserModel.findById(user._id).select('+auth.password');
    // After the link is written: linking grants no session by itself, and every
    // later provider sign-in meets this same gate.
    await twoFactorService.requireForPortal(fresh, { provider, portalKey });
    const payload = await authPayload(fresh);
    assertPortalLogin(portalKey, payload.user.roles);
    return payload;
  },

  /** Auth-required: what the signed-in account can sign in with. */
  async myConnectedAccounts(userId: string) {
    const user = await UserModel.findById(userId).select(CONNECTED_FIELDS);
    if (!user) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return connectedAccountsOf(user);
  },

  /**
   * Auth-required: link a Google account from Profile > Connected Accounts.
   *
   * The Gmail need not match the account's own email — a user may sign in with
   * a Google address they never registered with — but it must not already be
   * linked elsewhere, and this account must not already hold a different one.
   */
  async connectGoogleAccount(userId: string, idToken: string) {
    const info = await verifyGoogleIdToken(idToken);
    const email = info.email.toLowerCase();
    const user = await UserModel.findById(userId).select(CONNECTED_FIELDS);
    if (!user) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const existingId = (user as any).auth?.google_id as string | undefined;
    if (existingId === info.sub) {
      return connectedAccountsOf(user);
    }
    if (existingId) {
      throw new GraphQLError(
        'A Google account is already connected. Disconnect it before connecting another.',
        { extensions: { code: 'CONFLICT' } }
      );
    }
    const takenBy = await UserModel.findOne({ 'auth.google_id': info.sub });
    if (takenBy && String(takenBy._id) !== String(user._id)) {
      throw new GraphQLError('This Google account is already connected to another Duncit account.', {
        extensions: { code: 'CONFLICT' },
      });
    }

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          'auth.google_id': info.sub,
          'auth.google_email': email,
          'auth.google_linked_at': new Date(),
        },
      }
    );
    const fresh = await UserModel.findById(user._id).select(CONNECTED_FIELDS);
    return connectedAccountsOf(fresh);
  },

  /**
   * Auth-required: unlink the Google account.
   *
   * Refused without a password: Google would be the account's only way in, and
   * disconnecting it would lock the user out of their own account with no
   * self-serve way back.
   */
  async disconnectGoogleAccount(userId: string) {
    const user = await UserModel.findById(userId).select('+auth.password');
    if (!user) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }
    if (!(user as any).auth?.google_id) {
      throw new GraphQLError('No Google account is connected.', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!(user as any).auth?.password) {
      throw new GraphQLError(
        'Set a password before disconnecting Google — it is currently the only way to sign in to this account.',
        { extensions: { code: 'FORBIDDEN' } }
      );
    }

    await UserModel.updateOne(
      { _id: user._id },
      {
        $unset: { 'auth.google_id': '', 'auth.google_email': '', 'auth.google_linked_at': '' },
        // The last login really did happen over Google, but leaving the marker
        // pointing at a provider the account no longer has makes the admin list
        // read as still-connected. Email is now the only truth.
        $set: { 'auth.last_login_provider': 'EMAIL' },
      }
    );
    const fresh = await UserModel.findById(user._id).select(CONNECTED_FIELDS);
    return connectedAccountsOf(fresh);
  },

  async signupWithGoogle(input: GoogleSignupDTO, acceptance?: PolicyAcceptanceIntent) {
    return this.signupWithSocial('GOOGLE', input, acceptance);
  },

  async signupWithApple(input: AppleSignupDTO, acceptance?: PolicyAcceptanceIntent) {
    return this.signupWithSocial('APPLE', input, acceptance);
  },

  /**
   * Make an account from a provider credential — Google or Apple, the same door.
   *
   * New-account-only. The WhatsApp proof is spent before the transaction, and
   * the account is made with the provider's id already linked, so it is never
   * without a way in.
   */
  async signupWithSocial(
    provider: SocialProvider,
    input: GoogleSignupDTO & Partial<Pick<AppleSignupDTO, 'first_name' | 'last_name'>>,
    acceptance?: PolicyAcceptanceIntent
  ) {
    const spec = SOCIAL_PROVIDERS[provider];
    const info = await spec.verify(input.id_token);
    const email = info.email;
    if (isPlaceholderPhone(input.phone_number)) {
      throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    /*
      The same proof the email door spends, for the same reason: a provider
      credential says which mailbox somebody holds and nothing about how to
      reach them. Redeemed and spent BEFORE the transaction — an account whose
      number is verified afterwards is an account that can skip the step.
    */
    const proof = await whatsappAuthService.redeemSignupProof(
      input.whatsapp_token,
      input.phone_extension,
      input.phone_number
    );
    await whatsappAuthService.spendSignupProof(proof);
    // Unticked, the profile phone stays blank on purpose — the person said
    // their mobile number is a different one. The WhatsApp number is written
    // either way, below.
    const alsoMobile = input.whatsapp_is_mobile !== false;
    let created: any = null;
    const session = await UserModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const existing = await UserModel.findOne({
          $or: [{ [spec.idPath]: info.sub }, { 'auth.email': email }],
        })
          .select('+auth.password')
          .session(session);
        if (existing) {
          const message = (existing as any).auth?.password
            ? 'Please login with email. You registered using email and password.'
            : `${spec.label} account already exists. Please login with ${spec.label}.`;
          throw new GraphQLError(message, { extensions: { code: 'CONFLICT' } });
        }
        // Both fields a number can live in, exactly as the email door checks:
        // one number on two accounts leaves the three phone doors picking
        // between them.
        const phoneExists = await UserModel.findOne({
          $or: [
            {
              'auth.phone.number': input.phone_number,
              'auth.phone.extension': input.phone_extension,
            },
            {
              'communication.whatsapp.number': input.phone_number,
              'communication.whatsapp.extension': input.phone_extension,
            },
          ],
        }).session(session);
        if (phoneExists) {
          throw new GraphQLError(
            'This phone number is already registered. Please use a different number or login.',
            { extensions: { code: 'CONFLICT' } }
          );
        }
        const { first, last } = socialSignupName(spec, info, input);
        const username = await nextFreeUsername(first, last);
        const docs = await UserModel.create(
          [
            {
              ...shapeUserDoc(
                {
                  first_name: first,
                  last_name: last,
                  email,
                  phone_number: alsoMobile ? input.phone_number : '',
                  phone_extension: input.phone_extension,
                  dob: input.dob,
                  city: input.city ?? null,
                  zone: input.zone ?? null,
                  profile_photo: info.picture || undefined,
                },
                {
                  ...(provider === 'GOOGLE' ? { googleId: info.sub } : { appleId: info.sub }),
                  emailVerified: true,
                  username,
                  phoneVerified: alsoMobile,
                }
              ),
              communication: {
                whatsapp: {
                  extension: input.phone_extension,
                  number: input.phone_number,
                  verified_at: new Date(),
                },
              },
            },
          ],
          { session }
        );
        created = docs[0];
        await UserRoleModel.create(
          [
            {
              user_id: created._id,
              role: 'USER',
              scope: { city: null, zone: null },
            },
          ],
          { session }
        );
      });
    } catch (e: any) {
      throw socialSignupError(e);
    } finally {
      await session.endSession();
    }
    if (!created) {
      throw new GraphQLError(`Could not create ${spec.label} account`, {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
    await welcomeNewAccount(created, `signupWith${spec.label}`);
    await recordSignupAcceptance(created, spec.acceptanceMethod, acceptance);
    await applySignupMarketingChoice(created, acceptance?.marketing_opt_in === true);
    await UserModel.updateOne(
      { _id: created._id },
      {
        $set: {
          'auth.last_login_provider': provider,
          'auth.last_login_at': new Date(),
        },
      }
    );
    const fresh = await UserModel.findById(created._id);
    await userAuditService.recordCreate(String(created._id), fresh);
    return authPayload(fresh);
  },
};
