import { challengeService, type ChallengeInput } from './challenge.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = ['SUPER_ADMIN', 'CHALLENGE_MANAGER'];

export const challengeResolvers = {
  Query: {
    challenges: async (_p: unknown, args: { search?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeService.list(args.search ?? null);
    },
    challengesTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeService.table(args.query);
    },
    challengeStats: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeService.stats();
    },
    challenge: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeService.getById(args.id);
    },
  },
  Mutation: {
    createChallenge: async (_p: unknown, args: { input: ChallengeInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeService.create(args.input);
    },
    updateChallenge: async (
      _p: unknown,
      args: { id: string; input: ChallengeInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return challengeService.update(args.id, args.input);
    },
    deleteChallenge: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeService.remove(args.id);
    },
  },
};
