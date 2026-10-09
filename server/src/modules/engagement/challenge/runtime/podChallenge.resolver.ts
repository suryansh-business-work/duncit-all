import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { challengeService } from '../challenge.service';
import { CHALLENGE_ACTIONS, type ChallengeAction } from './challenge.lifecycle';
import { podChallengeService, type CreatePodChallengeInput, type PodChallengeSettingsInput, type RosterInput } from './podChallenge.service';
import { podChallengeScoring, type ScoreInput } from './podChallenge.scoring';
import { podChallengeControls, type ClockAction } from './podChallenge.controls';
import { podChallengeBallots, type CriterionScore } from './podChallenge.ballots';
import { podChallengeResults } from './podChallenge.result';

/**
 * Pod challenge API. Reads are open to signed-out spectators (the service
 * decides what they may see); every write needs a session, and the service
 * checks host / attendee / judge / staff rights against the database.
 */

const CLOCK_ACTIONS: readonly ClockAction[] = ['START', 'STOP', 'RESET'];

function oneOf<T extends string>(value: string, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) {
    throw new GraphQLError(`Unsupported action ${value}`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return value as T;
}

type Id = { id: string };
type ToolArgs = Id & { tool_instance_id: string };

export const podChallengeResolvers = {
  Query: {
    podChallenges: (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) =>
      podChallengeService.listForPod(args.pod_id, ctx.user),
    podChallenge: (_p: unknown, args: Id, ctx: GraphQLContext) => podChallengeService.get(args.id, ctx.user),
    podChallengeSetup: async (_p: unknown, args: { pod_id: string }, ctx: GraphQLContext) => {
      const setup = await podChallengeService.setup(args.pod_id, requireAuth(ctx));
      const all = await challengeService.list(null);
      return { ...setup, templates: all.filter((t) => t && setup.template_ids.includes(t.id)) };
    },
    podChallengeScoreLog: (_p: unknown, args: { challenge_id: string; limit?: number | null }, ctx: GraphQLContext) =>
      podChallengeScoring.recent(args.challenge_id, requireAuth(ctx), args.limit ?? 50),
  },
  Mutation: {
    createPodChallenge: (_p: unknown, args: { input: CreatePodChallengeInput }, ctx: GraphQLContext) =>
      podChallengeService.create(args.input, requireAuth(ctx)),
    updatePodChallengeSettings: (_p: unknown, args: Id & { input: PodChallengeSettingsInput }, ctx: GraphQLContext) =>
      podChallengeService.updateSettings(args.id, args.input, requireAuth(ctx)),
    setPodChallengeRoster: (_p: unknown, args: Id & { input: RosterInput }, ctx: GraphQLContext) =>
      podChallengeService.setRoster(args.id, args.input, requireAuth(ctx)),
    transitionPodChallenge: (_p: unknown, args: Id & { action: string }, ctx: GraphQLContext) =>
      podChallengeService.transition(args.id, oneOf<ChallengeAction>(args.action, CHALLENGE_ACTIONS), requireAuth(ctx)),
    recordPodChallengeScore: (_p: unknown, args: { input: ScoreInput }, ctx: GraphQLContext) =>
      podChallengeScoring.record(args.input, requireAuth(ctx)),
    voidPodChallengeScore: (_p: unknown, args: { event_id: string; reason?: string | null }, ctx: GraphQLContext) =>
      podChallengeScoring.void(args.event_id, args.reason, requireAuth(ctx)),
    controlPodChallengeClock: (_p: unknown, args: ToolArgs & { action: string }, ctx: GraphQLContext) =>
      podChallengeControls.clock(args.id, args.tool_instance_id, oneOf(args.action, CLOCK_ACTIONS), requireAuth(ctx)),
    setPodChallengeVoting: (_p: unknown, args: ToolArgs & { open: boolean }, ctx: GraphQLContext) =>
      podChallengeControls.voting(args.id, args.tool_instance_id, args.open, requireAuth(ctx)),
    setPodChallengeRound: (_p: unknown, args: Id & { round: number }, ctx: GraphQLContext) =>
      podChallengeControls.round(args.id, args.round, requireAuth(ctx)),
    castPodChallengeVote: (_p: unknown, args: ToolArgs & { candidate_id: string }, ctx: GraphQLContext) =>
      podChallengeBallots.vote(args.id, args.tool_instance_id, args.candidate_id, requireAuth(ctx)),
    ratePodChallengeCompetitor: (
      _p: unknown,
      args: ToolArgs & { candidate_id: string; value: number },
      ctx: GraphQLContext
    ) => podChallengeBallots.rate(args.id, args.tool_instance_id, args.candidate_id, args.value, requireAuth(ctx)),
    judgePodChallengeCompetitor: (
      _p: unknown,
      args: ToolArgs & { candidate_id: string; scores: CriterionScore[] },
      ctx: GraphQLContext
    ) => podChallengeBallots.judge(args.id, args.tool_instance_id, args.candidate_id, args.scores, requireAuth(ctx)),
    publishPodChallengeResult: (_p: unknown, args: Id & { reason?: string | null }, ctx: GraphQLContext) =>
      podChallengeResults.publish(args.id, args.reason, requireAuth(ctx)),
  },
};
