import { userService } from '@modules/access/user/user.service';
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  requestPasswordChangeSchema,
  changePasswordSchema,
  deleteMyAccountSchema,
  googleSignupSchema,
} from './auth.validator';
import { validate } from '@utils/validate';
import type { GraphQLContext } from '@context';

export const authResolvers = {
  Mutation: {
    register: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(registerSchema, args.input);
      return userService.register(data);
    },
    login: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(loginSchema, args.input);
      return userService.login(data);
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
    signupWithGoogle: async (_p: unknown, args: { input: unknown }) => {
      const data = await validate(googleSignupSchema, args.input);
      return userService.signupWithGoogle(data);
    },
    seedSuperAdmin: async () => {
      return userService.seedSuperAdmin();
    },
  },
};
