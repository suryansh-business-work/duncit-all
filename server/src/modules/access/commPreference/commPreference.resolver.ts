import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { commPreferenceService } from './commPreference.service';

const requireUser = (ctx: GraphQLContext) => {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user.id;
};

export const commPreferenceResolvers = {
  Query: {
    myCommunicationPreference: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      commPreferenceService.sheet(requireUser(ctx)),
  },
  Mutation: {
    setMyOtpChannel: (
      _p: unknown,
      args: { channel: string; enabled: boolean },
      ctx: GraphQLContext
    ) => commPreferenceService.setOtpChannel(requireUser(ctx), args.channel, args.enabled),
  },
};
