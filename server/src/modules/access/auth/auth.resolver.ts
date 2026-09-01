import { userService } from '@modules/access/user/user.service';
import {
  completePasswordResetSchema,
  loginSchema,
  loginWithOtpSchema,
  passwordResetLookupSchema,
  requestLoginOtpSchema,
  registerSchema,
  requestPasswordResetSchema,
  requestPortalLoginOtpSchema,
  portalLoginOtpSchema,
  resetPasswordSchema,
  requestPasswordChangeSchema,
  changePasswordSchema,
  googleSignupSchema,
  verifyPasswordResetCodeSchema,
} from './auth.validator';
import {
  passwordResetService,
  type PasswordResetLookup,
} from './password-reset.service';
import { validate } from '@utils/validate';
import { assertEligibleDob } from '@utils/age';
import { referralService } from '@modules/engagement/referral/referral.service';
import { assertPoliciesAccepted } from '@modules/content/policyAcceptance/policyAcceptance.service';
import type {
  PolicyAcceptanceIntent,
  PolicyAcceptanceSurface,
} from '@modules/content/policyAcceptance/policyAcceptance.model';
import type { GraphQLContext } from '@context';
import type { SignInContext } from '@modules/access/user/user.signin';

/** What a signup door carries besides the account itself. Never part of the
 * validated DTO — the yup schemas strip unknown keys on purpose, so acceptance
 * stays out of the user document it has no business being in (referral_code
 * rides alongside for exactly the same reason). */
interface SignupPolicyInput {
  accepted_policy_ids?: string[] | null;
  accepted_policy_surface?: PolicyAcceptanceSurface | null;
}

const acceptanceIntent = (input?: SignupPolicyInput | null): PolicyAcceptanceIntent => ({
  policy_ids: input?.accepted_policy_ids ?? [],
  surface: input?.accepted_policy_surface ?? 'UNKNOWN',
});

/** The signed-in user's id, or the standard UNAUTHENTICATED refusal. */
async function requireUserId(ctx: GraphQLContext): Promise<string> {
  if (!ctx.user) {
    const { GraphQLError } = await import('graphql');
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user.id;
}

/**
 * What the "new sign-in" notice describes, off the request that signed in.
 *
 * The DUID is the same anonymous device id the clients already send for
 * attribution, so nothing new has to be collected. `x-forwarded-for` is the
 * proxy's word for where the request came from and is used only to write a
 * human-readable line — nothing is decided on it.
 */
const signInContext = (ctx: GraphQLContext): SignInContext => ({
  deviceId: ctx.device_id,
  userAgent: String(ctx.req.headers['user-agent'] ?? ''),
  place: String(ctx.req.headers['x-forwarded-for'] ?? '')
    .split(',')[0]
    ?.trim(),
});

export const authResolvers = {
  Query: {
    myConnectedAccounts: async (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      return userService.myConnectedAccounts(await requireUserId(ctx));
    },
  },
  Mutation: {
    register: async (
      _p: unknown,
      args: { input: SignupPolicyInput & { referral_code?: string | null } }
    ) => {
      const data = await validate(registerSchema, args.input);
      // The age gate is admin-configured, so it lives here rather than in the
      // static yup schema — and it must be server-side: the client rule only
      // shapes the form, it cannot stop a hand-rolled mutation.
      await assertEligibleDob(data.dob);
      // Same reasoning, same place: the tick boxes shape the form, they cannot
      // stop a hand-rolled mutation. Checked BEFORE the account exists, so a
      // refusal leaves nothing behind.
      await assertPoliciesAccepted(args.input?.accepted_policy_ids);

      /*
        The referral code is checked BEFORE the account is created and linked
        after, which is the only ordering that works in both directions: a typo
        has to fail while the form is still on screen (the box is gone from
        Refer & Earn, so a code lost here is lost for good), and the reward
        cannot be recorded against a user id that does not exist yet.

        It never rides `data` — registerSchema strips unknown keys, so the code
        stays out of the user document it has no business being in.
      */
      const code = (args.input?.referral_code ?? '').trim().toUpperCase();
      const referrerId = code ? await referralService.validateCode(code) : null;
      const payload = await userService.register(data, acceptanceIntent(args.input));
      if (referrerId) await referralService.link(referrerId, payload.user.user_id, code);
      return payload;
    },
    login: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const data = await validate(loginSchema, args.input);
      return userService.login(data, signInContext(ctx));
    },
    requestPortalLoginOtp: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(requestPortalLoginOtpSchema, args.input);
      return userService.requestPortalLoginOtp(data);
    },
    loginWithPortalOtp: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const data = await validate(portalLoginOtpSchema, args.input);
      return userService.loginWithPortalOtp(data, signInContext(ctx));
    },
    requestLoginOtp: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(requestLoginOtpSchema, args.input);
      return userService.requestLoginOtp(data as PasswordResetLookup);
    },
    loginWithOtp: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const data = await validate(loginWithOtpSchema, args.input);
      return userService.loginWithOtp(
        data as PasswordResetLookup & { otp: string },
        signInContext(ctx)
      );
    },
    requestPasswordResetCode: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(passwordResetLookupSchema, args.input);
      return passwordResetService.request(data as PasswordResetLookup);
    },
    verifyPasswordResetCode: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(verifyPasswordResetCodeSchema, args.input);
      return passwordResetService.verify(data as PasswordResetLookup & { otp: string });
    },
    completePasswordReset: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(completePasswordResetSchema, args.input);
      return passwordResetService.complete(data);
    },
    requestPasswordResetOtp: async (_p: unknown, args: { email: string }) => {
      const data = await validate(requestPasswordResetSchema, { email: args.email });
      return userService.requestPasswordResetOtp(data);
    },
    resetPasswordWithOtp: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(resetPasswordSchema, args.input);
      return userService.resetPasswordWithOtp(data);
    },
    requestPasswordChangeOtp: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(requestPasswordChangeSchema, args.input);
      return userService.requestPasswordChangeOtp(ctx.user.id, data);
    },
    changePasswordWithOtp: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(changePasswordSchema, args.input);
      return userService.changePasswordWithOtp(ctx.user.id, data);
    },
    requestAccountDeletionOtp: async (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return userService.requestAccountDeletionOtp(ctx.user.id);
    },
    loginWithGoogle: async (
      _p: unknown,
      args: { input: { id_token: string; portal_key?: string | null } },
      ctx: GraphQLContext
    ) => {
      return userService.loginWithGoogle(
        args.input?.id_token,
        args.input?.portal_key,
        signInContext(ctx)
      );
    },
    // Unauthenticated by design — see the schema note: the verified Google
    // token IS the proof, the consent step supplies the intent.
    linkGoogleAccount: async (
      _p: unknown,
      args: { input: { id_token: string; portal_key?: string | null } }
    ) => {
      return userService.linkGoogleAccount(args.input?.id_token, args.input?.portal_key);
    },
    signupWithGoogle: async (_p: unknown, args: { input: SignupPolicyInput }) => {
      const data = await validate(googleSignupSchema, args.input);
      await assertEligibleDob(data.dob);
      await assertPoliciesAccepted(args.input?.accepted_policy_ids);
      return userService.signupWithGoogle(data, acceptanceIntent(args.input));
    },
    connectGoogleAccount: async (
      _p: unknown,
      args: { input: { id_token: string } },
      ctx: GraphQLContext
    ) => {
      return userService.connectGoogleAccount(await requireUserId(ctx), args.input?.id_token);
    },
    disconnectGoogleAccount: async (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      return userService.disconnectGoogleAccount(await requireUserId(ctx));
    },
    seedSuperAdmin: async () => {
      return userService.seedSuperAdmin();
    },
  },
};
