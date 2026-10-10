import { GraphQLError } from 'graphql';
import type { ClientSession } from 'mongoose';
import type { AuthUser } from '@context';
import type { JudgeCriterion } from '../tools/challengeTool.config';
import { ChallengeVoteModel } from './challengeLedger.model';
import { accessFor, isJudge, loadPod } from './podChallenge.access';
import { ledgerCommit, loadChallenge } from './podChallenge.commit';
import { assertCompetitor, toolOf } from './podChallenge.scoring';
import { toView } from './podChallenge.view';
import type { PodChallengeDoc } from './podChallenge.model';

/**
 * Audience and judge input. Every ballot is an upsert on a unique key (one
 * vote per voter per round, one rating/judge sheet per voter per competitor),
 * so a double tap or a retry changes the ballot instead of adding a second.
 * The write is refused unless — at the moment it commits — the challenge is
 * still live and, for votes and ratings, that tool's voting is still open.
 */

export interface CriterionScore {
  key: string;
  value: number;
}

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function forbidden(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

/** True when the voter is (or plays for) the candidate. */
function isSelf(doc: PodChallengeDoc, candidateId: string, userId: string) {
  const competitor = doc.competitors.find((c) => c.competitor_id === candidateId);
  if (competitor?.user_id?.toString() === userId) return true;
  return doc.players.some((p) => p.team_id === candidateId && p.user_id?.toString() === userId);
}

async function audience(challengeId: string, instanceId: string, candidateId: string, user: AuthUser) {
  const doc = await loadChallenge(challengeId);
  const pod = await loadPod(doc.pod_id.toString());
  const access = await accessFor(user, pod);
  if (doc.status !== 'LIVE') bad('This challenge is not live');
  if (!doc.audience_interaction_enabled) forbidden('Audience participation is turned off');
  if (!access.isAttendee) forbidden('Only confirmed attendees of this pod can take part');
  const state = doc.tool_state.find((s) => s.instance_id === instanceId);
  if (!state?.voting_open) bad('Voting is closed');
  assertCompetitor(doc, candidateId);
  return { doc, pod, access, tool: toolOf(doc, instanceId) };
}

/** Commits a ballot only while the challenge is live and the tool's vote is open. */
function openGuard(instanceId: string) {
  return {
    statuses: ['LIVE'] as const,
    filter: { audience_interaction_enabled: true, tool_state: { $elemMatch: { instance_id: instanceId, voting_open: true } } },
  };
}

function upsertBallot(session: ClientSession | undefined, key: Record<string, unknown>, set: Record<string, unknown>) {
  return ChallengeVoteModel.updateOne(key, { $set: set }, { upsert: true, session });
}

export const podChallengeBallots = {
  async vote(challengeId: string, instanceId: string, candidateId: string, user: AuthUser) {
    const { doc, pod, access, tool } = await audience(challengeId, instanceId, candidateId, user);
    if (tool.tool_type !== 'VOTING') bad('This tool does not take votes');
    if (!tool.config.allow_self_vote && isSelf(doc, candidateId, user.id)) bad('You cannot vote for yourself');
    const key = { challenge_id: doc._id, tool_instance_id: instanceId, round: doc.current_round, voter_id: user.id, kind: 'VOTE', scope_key: '' };
    const next = await ledgerCommit(
      doc,
      openGuard(instanceId),
      (session) => upsertBallot(session, key, { candidate_id: candidateId, value: 1 }),
      { signal: 'VOTE' }
    );
    return toView(next, pod, access, user.id);
  },

  async rate(challengeId: string, instanceId: string, candidateId: string, value: number, user: AuthUser) {
    const { doc, pod, access, tool } = await audience(challengeId, instanceId, candidateId, user);
    if (tool.tool_type !== 'RATING') bad('This tool does not take ratings');
    const max = Number(tool.config.scale_max ?? 5);
    if (!Number.isInteger(value) || value < 1 || value > max) bad(`Rating must be between 1 and ${max}`);
    if (!tool.config.allow_self_rating && isSelf(doc, candidateId, user.id)) bad('You cannot rate yourself');
    const key = { challenge_id: doc._id, tool_instance_id: instanceId, round: doc.current_round, voter_id: user.id, kind: 'RATING', scope_key: candidateId };
    const next = await ledgerCommit(
      doc,
      openGuard(instanceId),
      (session) => upsertBallot(session, key, { candidate_id: candidateId, value }),
      { signal: 'RATING' }
    );
    return toView(next, pod, access, user.id);
  },

  async judge(challengeId: string, instanceId: string, candidateId: string, scores: CriterionScore[], user: AuthUser) {
    const doc = await loadChallenge(challengeId);
    const pod = await loadPod(doc.pod_id.toString());
    const access = await accessFor(user, pod);
    if (!isJudge(doc, user.id)) forbidden('Only assigned judges can score this challenge');
    if (doc.status !== 'LIVE') bad('This challenge is not live');
    const tool = toolOf(doc, instanceId);
    if (tool.tool_type !== 'JUDGE_SCORING') bad('This tool does not take judge scores');
    assertCompetitor(doc, candidateId);
    const criteria = (tool.config.criteria as JudgeCriterion[] | undefined) ?? [];
    const given = new Map(scores.map((s) => [s.key, s.value]));
    const sheet = criteria.map((c) => {
      const value = given.get(c.key);
      if (value === undefined || !Number.isFinite(value) || value < 0 || value > c.max) {
        bad(`${c.label} needs a score between 0 and ${c.max}`);
      }
      return { key: c.key, value };
    });
    const key = { challenge_id: doc._id, tool_instance_id: instanceId, round: doc.current_round, voter_id: user.id, kind: 'JUDGE', scope_key: candidateId };
    const next = await ledgerCommit(
      doc,
      { statuses: ['LIVE'] },
      (session) => upsertBallot(session, key, { candidate_id: candidateId, value: 0, criteria: sheet }),
      { actorId: user.id, action: 'JUDGE_SCORE', newValue: { candidate_id: candidateId, criteria: sheet } }
    );
    return toView(next, pod, access, user.id);
  },
};
