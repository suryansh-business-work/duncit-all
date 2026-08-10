import { userService } from '@modules/access/user/user.service';
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  requestPortalLoginOtpSchema,
  portalLoginOtpSchema,
  resetPasswordSchema,
  requestPasswordChangeSchema,
  changePasswordSchema,
  deleteMyAccountSchema,
  googleSignupSchema,
} from './auth.validator';
import { validate } from '@utils/validate';
import { assertEligibleDob } from '@utils/age';
import type { GraphQLContext } from '@context';

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

export const authResolvers = {
  Query: {
    myConnectedAccounts: async (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      return userService.myConnectedAccounts(await requireUserId(ctx));
    },
  },
  Mutation: {
    register: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(registerSchema, args.input);
      // The age gate is admin-configured, so it lives here rather than in the
      // static yup schema — and it must be server-side: the client rule only
      // shapes the form, it cannot stop a hand-rolled mutation.
      await assertEligibleDob(data.dob);
      return userService.register(data);
    },
    login: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(loginSchema, args.input);
      return userService.login(data);
    },
    requestPortalLoginOtp: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(requestPortalLoginOtpSchema, args.input);
      return userService.requestPortalLoginOtp(data);
    },
    loginWithPortalOtp: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(portalLoginOtpSchema, args.input);
      return userService.loginWithPortalOtp(data);
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
    deleteMyAccount: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      if (!ctx.user) {
        const { GraphQLError } = await import('graphql');
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const data = await validate(deleteMyAccountSchema, args.input);
      return userService.deleteMyAccount(ctx.user.id, data);
    },
    loginWithGoogle: async (
      _p: unknown,
      args: { input: { id_token: string; portal_key?: string | null } }
    ) => {
      return userService.loginWithGoogle(args.input?.id_token, args.input?.portal_key);
    },
    // Unauthenticated by design — see the schema note: the verified Google
    // token IS the proof, the consent step supplies the intent.
    linkGoogleAccount: async (
      _p: unknown,
      args: { input: { id_token: string; portal_key?: string | null } }
    ) => {
      return userService.linkGoogleAccount(args.input?.id_token, args.input?.portal_key);
    },
    signupWithGoogle: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(googleSignupSchema, args.input);
      await assertEligibleDob(data.dob);
      return userService.signupWithGoogle(data);
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
