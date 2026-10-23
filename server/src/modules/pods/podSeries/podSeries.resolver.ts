import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';

/** Recurring pods are retired (see podSeries.schema.ts): an installed app that
 * still offers them is told to update instead of half-creating anything. */
const retired = () =>
  new GraphQLError('Recurring pods are no longer available. Please update the app.', {
    extensions: { code: 'BAD_USER_INPUT' },
  });

const refuse = (_p: unknown, _args: unknown, ctx: GraphQLContext): never => {
  requireAuth(ctx);
  throw retired();
};

export const podSeriesResolvers = {
  Query: {
    podSeriesPreview: refuse,
    podSeriesLimits: refuse,
    // Every pod is a one-time pod now, which is what null tells Pod Details.
    podSeriesDates: () => null,
  },
  Mutation: {
    publishPodDraftSeries: refuse,
    venueDecidePodSeries: refuse,
    hostCancelPodSeries: refuse,
    joinFreePodDates: refuse,
  },
};
