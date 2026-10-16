import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { podSeriesService, type SeriesPlanInput } from './podSeries.service';

type PlanArgs = SeriesPlanInput & { skip_dates?: string[] | null };

export const podSeriesResolvers = {
  Query: {
    podSeriesPreview: async (_p: unknown, args: { input: PlanArgs }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return podSeriesService.preview(args.input);
    },
  },
  Mutation: {
    publishPodDraftSeries: async (
      _p: unknown,
      args: { draft_id: string; input: Record<string, unknown>; plan: PlanArgs },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podSeriesService.publishFromDraft(user.id, args.draft_id, args.input, args.plan);
    },
    venueDecidePodSeries: async (
      _p: unknown,
      args: { series_id: string; approve: boolean; reason?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podSeriesService.venueDecide(user.id, args.series_id, args.approve, args.reason);
    },
    hostCancelPodSeries: async (
      _p: unknown,
      args: { series_id: string; reason_subject: string; reason_note?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podSeriesService.hostCancelUpcoming(user.id, args.series_id, args.reason_subject, args.reason_note);
    },
  },
};
