/**
 * Account-creation helpers shared by self sign-up, social sign-up and the
 * admin/seed create paths: the user document shape, duplicate-key errors,
 * welcome + policy-acceptance side effects and username allocation.
 */
import { GraphQLError } from 'graphql';
import { UserModel } from './user.model';
import type {
  PolicyAcceptanceIntent,
  PolicyAcceptanceMethod,
} from '@modules/content/policyAcceptance/policyAcceptance.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { sendWelcomeEmail } from '@services/email/email.service';
import { generateUsername } from './username';
import { logs } from '@observability/log';

// Spec: reject placeholder/dummy phone numbers in non-seeded paths.
export const isPlaceholderPhone = (n: string) => /^0+$/.test(String(n || '').trim());

/**
 * The welcome a new account gets, whichever door it came in through — email
 * signup, Google signup or the admin form. One helper so a fourth door cannot
 * quietly get the mail and miss the message. `origin` names the caller in the
 * log, exactly as the three separate sends used to.
 */
export async function welcomeNewAccount(created: any, origin: string) {
  // Unconditional: an account with no address records a FAILED welcome row
  // rather than vanishing, which is the one place it can still be noticed.
  sendWelcomeEmail(created.auth?.email ?? '', created.profile?.first_name).catch((e) =>
    logs.server.error('user.service', origin, { error: e, msg: 'Email send failed' })
  );
  /*
    The ACCOUNT is what this message is about, so the account is what holds the
    one-message-per-recipient slot.

    Left empty — the shape for a message with no entity above it — the slot is
    `(USER_WELCOME, '', number)`, one welcome per NUMBER for all time. The
    signup form now proves a WhatsApp number with a code before the account
    exists, so a number that has ever been through signup silently answers
    "Already sent" on every later attempt: a person who deleted their account
    and came back, a family sharing one phone, and every test signup after the
    first. Keyed on the account instead it is still exactly once — a user id is
    created once and never reused — and it is once per PERSON rather than once
    per handset.

    Not awaited, like the mail above it: the send is an HTTP round trip to the
    WhatsApp provider, and signup used to sit on it before answering. The
    account already exists by now, and `whatsappService.send` records its own
    outcome in the WhatsApp log, so nothing is lost by answering first.
  */
  whatsappService
    .send({
      event: 'USER_WELCOME',
      entityId: String(created._id),
      user: created,
      name: created.profile?.first_name,
      params: [created.profile?.first_name],
    })
    .catch((e) =>
      logs.server.error('user.service', origin, { error: e, msg: 'WhatsApp welcome failed' })
    );
}

/**
 * The policies a fresh signup ticked, written once the account is real.
 *
 * Beside {@link welcomeNewAccount} rather than inside it: the admin-create door
 * goes through that helper too, and an account somebody typed into the admin
 * form accepted nothing. It must also run AFTER the commit — signupWithGoogle
 * creates its user inside `session.withTransaction`, and a row written in that
 * session would survive a rollback, leaving acceptances for a user that never
 * existed.
 *
 * Awaited and allowed to throw, unlike the welcome mail: a signup we could not
 * record the acceptance for is precisely what this gate exists to prevent.
 */
export async function recordSignupAcceptance(
  created: any,
  method: PolicyAcceptanceMethod,
  acceptance?: PolicyAcceptanceIntent
) {
  if (!acceptance?.policy_ids?.length) return;
  // Dynamic, like every other cross-module call in this file — the acceptance
  // service reaches the email stack, and a static edge from here is how the
  // import cycles in this module started last time.
  const { policyAcceptanceService } = await import(
    '@modules/content/policyAcceptance/policyAcceptance.service'
  );
  await policyAcceptanceService.recordSignupAcceptance({
    user_id: String(created._id),
    email: created.auth?.email ?? '',
    name: created.profile?.first_name ?? '',
    policy_ids: acceptance.policy_ids,
    method,
    surface: acceptance.surface,
  });
}

// Shape a CreateUserDTO / RegisterDTO into the nested storage layout.
export function shapeUserDoc(
  input: any,
  opts?: {
    passwordHash?: string;
    googleId?: string;
    appleId?: string;
    emailVerified?: boolean;
    username?: string;
    /** Signup proved this number with a code before the document existed. */
    phoneVerified?: boolean;
  }
) {
  const phoneNumber = String(input.phone_number || '').trim();
  if (phoneNumber && isPlaceholderPhone(phoneNumber)) {
    throw new GraphQLError('Invalid phone number', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return {
    auth: {
      email: input.email ? String(input.email).toLowerCase() : undefined,
      is_email_verified: !!opts?.emailVerified,
      password: opts?.passwordHash,
      google_id: opts?.googleId,
      apple_id: opts?.appleId,
      // Only attach the phone subdocument when a number is supplied — the
      // schema requires number+extension when present, and omitting it keeps
      // the doc out of the unique phone index (partial on $type: string).
      ...(phoneNumber
        ? {
            phone: {
              number: phoneNumber,
              extension: input.phone_extension,
              is_verified: !!opts?.phoneVerified,
            },
          }
        : {}),
    },
    profile: {
      first_name: input.first_name,
      last_name: input.last_name,
      // Every account is created WITH a handle — see nextFreeUsername. It is
      // omitted rather than nulled when absent so the partial unique index
      // ignores the document instead of colliding every such row on null.
      ...(opts?.username ? { username: opts.username } : {}),
      dob: input.dob ? new Date(input.dob) : undefined,
      country: input.country ?? 'India',
      city: input.city ?? undefined,
      zone: input.zone ?? undefined,
      assigned_city: input.assigned_city ?? undefined,
      profile_photo: input.profile_photo ?? undefined,
    },
    metadata: {
      role_keys: Array.isArray(input.roles) && input.roles.length ? input.roles : ['USER'],
      assigned_zones: input.assigned_zones ?? [],
    },
  };
}

/** Map a Mongo duplicate-key error raised by register() onto its user-facing CONFLICT. */
export function registerDuplicateError(e: any): GraphQLError {
  const key = Object.keys(e?.keyPattern ?? {})[0] ?? '';
  if (key.includes('phone')) {
    return new GraphQLError(
      'This phone number is already registered. Please use a different number or login.',
      { extensions: { code: 'CONFLICT' } }
    );
  }
  if (key.includes('email')) {
    return new GraphQLError('Email already in use', { extensions: { code: 'CONFLICT' } });
  }
  return new GraphQLError('Account already exists', { extensions: { code: 'CONFLICT' } });
}

/**
 * A free @handle for a new account, or undefined when one cannot be minted.
 *
 * Never throws. A signup must not fail because the handle lookup did — the
 * account is still perfectly usable addressed by its id, and the migration
 * script picks up anything that slipped through.
 */
export async function nextFreeUsername(
  first: string | null | undefined,
  last: string | null | undefined
): Promise<string | undefined> {
  try {
    return await generateUsername(first, last, {
      isTaken: async (candidate) =>
        !!(await UserModel.exists({ 'profile.username': candidate })),
    });
  } catch (error) {
    logs.server.warn('user.service', 'nextFreeUsername', { error });
    return undefined;
  }
}

/**
 * Give an account the @handle it should have been created with.
 *
 * Every account made since handles shipped is minted one at signup, but the
 * ones made before that have none — and a profile with no handle has no
 * shareable link at all, only a storage id. There is no field for a member to
 * fix that with any more, so the platform fixes it: `me` is the one read every
 * such account performs, which makes it the place the gap closes.
 *
 * The cost on an account that already has one is a property check, not a
 * query. The write is guarded on the handle still being absent, so two devices
 * opening the app at once mint one handle rather than overwriting each other,
 * and it never throws: an account is perfectly usable without a handle, and a
 * failed backfill must not take the profile down with it.
 */
export async function ensureUsername<T extends { profile?: { username?: string | null } } | null>(
  doc: T
): Promise<T> {
  if (!doc || doc.profile?.username) return doc;
  const id = (doc as any)._id;
  try {
    const first = (doc as any).profile?.first_name ?? null;
    const last = (doc as any).profile?.last_name ?? null;
    const username = await nextFreeUsername(first, last);
    if (!username) return doc;
    // `$in: [null, ""]` matches a MISSING field as well as an empty one, so
    // the guard covers every shape a handle-less document comes in.
    const claimed = await UserModel.findOneAndUpdate(
      { _id: id, 'profile.username': { $in: [null, ''] } },
      { $set: { 'profile.username': username } },
      { new: true }
    );
    // Null means another request minted one first — re-read rather than
    // hand back the stale document the caller is about to serialise.
    return ((claimed ?? (await UserModel.findById(id))) ?? doc) as T;
  } catch (error) {
    logs.server.warn('user.service', 'ensureUsername', { error });
    return doc;
  }
}

/** The handle that is free for this account, or null when it is not. */
export async function usernameOwner(handle: string): Promise<string | null> {
  const owner = await UserModel.findOne({ 'profile.username': handle })
    .select('_id')
    .lean();
  return owner ? String(owner._id) : null;
}
