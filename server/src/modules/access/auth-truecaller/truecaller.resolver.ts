import type { GraphQLContext } from '@context';
import type { SignInContext } from '@modules/access/user/user.signin';
import { truecallerAuthService, type TruecallerAuthInput } from './truecaller.service';
import type { TruecallerIntent } from './truecaller.web';

/**
 * Composed into the auth resolvers, which own the sign-in context every door
 * records a login with.
 */
export const truecallerResolvers = (signInOf: (ctx: GraphQLContext) => SignInContext) => ({
  Query: {
    truecallerWebState: (_p: unknown, args: { request_nonce: string }) =>
      truecallerAuthService.webState(args.request_nonce),
  },
  Mutation: {
    startTruecallerWebLogin: (_p: unknown, args: { intent: TruecallerIntent; lang?: string | null }) =>
      truecallerAuthService.startWeb(args.intent, args.lang),
    loginWithTruecaller: (_p: unknown, args: { input: TruecallerAuthInput }, ctx: GraphQLContext) =>
      truecallerAuthService.continueWithTruecaller(args.input, signInOf(ctx)),
  },
});
