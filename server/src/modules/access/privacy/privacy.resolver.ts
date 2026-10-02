import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { privacyService, type TrackingConsentInput } from './privacy.service';

export const privacyResolvers = {
  Query: {
    myTrackingConsent: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      privacyService.mine(requireAuth(ctx).id),
    myDataExport: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      privacyService.exportMine(requireAuth(ctx).id),
  },
  Mutation: {
    setMyTrackingConsent: (
      _p: unknown,
      args: { input: TrackingConsentInput },
      ctx: GraphQLContext
    ) => privacyService.record(requireAuth(ctx).id, args.input),
  },
};
