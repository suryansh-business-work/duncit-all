import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { AI_USAGE_READ, AI_USAGE_WRITE } from '@modules/ai/openaiUsage/openaiUsage.resolver';
import { aiFeatureService } from './aiFeature.service';

// The AI portal's own roles: the same people who read spend and edit the rate
// card decide which AI features run. Never on the Redis response cache — the
// queries are role-gated (see redisResponseCache whitelist rules).
export const aiFeatureResolvers = {
  Query: {
    aiFeatures: (_p: unknown, args: { range_days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, AI_USAGE_READ);
      return aiFeatureService.list(args.range_days);
    },
    aiFeature: (
      _p: unknown,
      args: { key: string; range_days?: number | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, AI_USAGE_READ);
      return aiFeatureService.one(args.key, args.range_days);
    },
  },
  Mutation: {
    setAiFeatureEnabled: (
      _p: unknown,
      args: { key: string; enabled: boolean },
      ctx: GraphQLContext,
    ) => {
      const user = requireRole(ctx, AI_USAGE_WRITE);
      return aiFeatureService.setEnabled(args.key, args.enabled, user.id);
    },
  },
};
