import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { toolDefinition } from '../tools/challengeTool.catalogue';
import { ChallengeScoreEventModel } from './challengeLedger.model';
import { accessFor, assertManage, loadPod, type ChallengeAccess } from './podChallenge.access';
import { ledgerCommit, loadChallenge } from './podChallenge.commit';
import { toView } from './podChallenge.view';
import type { PodChallengeDoc } from './podChallenge.model';
import type { ChallengeStatus } from './challenge.lifecycle';

/**
 * Host/judge-side score entry. Scores are appended events; a mistake is fixed
 * by VOIDING the event (with a reason), never by editing it. While LIVE the
 * host scores freely. Once COMPLETED, a change is a CORRECTION: it needs a
 * reason, and after the result is published only Challenge Portal staff may
 * make it (and must republish).
 */

export interface ScoreInput {
  challenge_id: string;
  tool_instance_id: string;
  competitor_id: string;
  value: number;
  client_event_id: string;
  reason?: string | null;
}

const DUPLICATE_KEY = 11000;

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function forbidden(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

/** The status a score write must still find, and whether it is a correction. */
export function scoringWindow(doc: PodChallengeDoc, access: ChallengeAccess, reason?: string | null): ChallengeStatus {
  if (doc.status === 'LIVE') return 'LIVE';
  if (doc.status !== 'COMPLETED') bad('Scores can only change while the challenge is live');
  if (!reason?.trim()) bad('A correction after the challenge ends needs a reason');
  if (doc.result_version > 0 && !access.isStaff) forbidden('Published results can only be corrected by Challenge staff');
  return 'COMPLETED';
}

function toolOf(doc: PodChallengeDoc, instanceId: string) {
  const tool = doc.tools.find((t) => t.instance_id === instanceId);
  if (!tool) bad('This tool is not part of the challenge');
  return { ...tool, config: (tool.config ?? {}) as Record<string, unknown> };
}

function assertCompetitor(doc: PodChallengeDoc, competitorId: string) {
  if (!doc.competitors.some((c) => c.competitor_id === competitorId)) bad('Unknown competitor');
}

async function currentSum(challengeId: Types.ObjectId, instanceId: string, competitorId: string) {
  const [row] = await ChallengeScoreEventModel.aggregate<{ total: number }>([
    { $match: { challenge_id: challengeId, tool_instance_id: instanceId, competitor_id: competitorId, voided: false } },
    { $group: { _id: null, total: { $sum: '$value' } } },
  ]);
  return row?.total ?? 0;
}

/** Validates a value for the tool and returns the event type it records. */
async function eventFor(doc: PodChallengeDoc, input: ScoreInput): Promise<'INCREMENT' | 'SET'> {
  const tool = toolOf(doc, input.tool_instance_id);
  const def = toolDefinition(tool.tool_type);
  const value = input.value;
  if (!Number.isFinite(value)) bad('Score must be a number');

  if (def?.input === 'INCREMENT') {
    const steps = (tool.config.increments as number[] | undefined) ?? [];
    const allowed = tool.config.allow_negative ? [...steps, ...steps.map((s) => -s)] : steps;
    if (!allowed.includes(value)) bad('That amount is not one of this tool’s increments');
    const max = Number(tool.config.max_value ?? 0);
    if (max > 0 && (await currentSum(doc._id, tool.instance_id, input.competitor_id)) + value > max) {
      bad(`This counter cannot go above ${max}`);
    }
    return 'INCREMENT';
  }
  if (tool.tool_type === 'TIMER' && !tool.config.record_competitor_times) bad('This timer does not record times');
  if (tool.tool_type === 'RANKING' && (!Number.isInteger(value) || value < 1 || value > doc.competitors.length)) {
    bad(`Rank must be between 1 and ${doc.competitors.length}`);
  }
  if (!['MEASUREMENT', 'TIMER', 'RANKING'].includes(tool.tool_type)) bad('This tool does not take scores');
  if (value < 0) bad('Value cannot be negative');
  return 'SET';
}

async function managed(challengeId: string, user: AuthUser) {
  const doc = await loadChallenge(challengeId);
  const pod = await loadPod(doc.pod_id.toString());
  const access = await accessFor(user, pod);
  assertManage(access);
  return { doc, pod, access };
}

export const podChallengeScoring = {
  async record(input: ScoreInput, user: AuthUser) {
    const { doc, pod, access } = await managed(input.challenge_id, user);
    const clientId = input.client_event_id?.trim();
    if (!clientId || clientId.length > 64) bad('A client event id is required');
    // A retried request finds its own event and returns the current state.
    if (await ChallengeScoreEventModel.exists({ challenge_id: doc._id, client_event_id: clientId })) {
      return toView(doc, pod, access, user.id);
    }
    const status = scoringWindow(doc, access, input.reason);
    assertCompetitor(doc, input.competitor_id);
    const eventType = await eventFor(doc, input);
    let next: PodChallengeDoc;
    try {
      next = await ledgerCommit(
      doc,
      { statuses: [status] },
      (session) =>
        ChallengeScoreEventModel.create(
          [
            {
              challenge_id: doc._id,
              tool_instance_id: input.tool_instance_id,
              competitor_id: input.competitor_id,
              event_type: eventType,
              value: input.value,
              round: doc.current_round,
              performed_by: user.id,
              client_event_id: clientId,
              revision: doc.revision + 1,
            },
          ],
          { session }
        ),
      status === 'LIVE'
        ? { signal: 'SCORE' }
        : { actorId: user.id, action: 'SCORE_CORRECTION', newValue: { ...input }, reason: input.reason ?? '' }
      );
    } catch (error) {
      // Two copies of the same tap raced past the exists() check: the unique
      // index let exactly one in, so this one is already recorded.
      if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
      next = await loadChallenge(input.challenge_id);
    }
    return toView(next, pod, access, user.id);
  },

  async void(eventId: string, reason: string | null | undefined, user: AuthUser) {
    if (!Types.ObjectId.isValid(eventId)) bad('Invalid score id');
    const event = await ChallengeScoreEventModel.findById(eventId).lean();
    if (!event) bad('Score not found');
    const { doc, pod, access } = await managed(event.challenge_id.toString(), user);
    const status = scoringWindow(doc, access, reason);
    const next = await ledgerCommit(
      doc,
      { statuses: [status] },
      async (session) => {
        const res = await ChallengeScoreEventModel.updateOne(
          { _id: event._id, voided: false },
          { $set: { voided: true, voided_by: user.id, void_reason: reason?.trim() ?? '' } },
          { session }
        );
        if (!res.modifiedCount) bad('This score was already removed');
      },
      {
        actorId: user.id,
        action: 'SCORE_VOID',
        oldValue: { competitor_id: event.competitor_id, value: event.value, tool: event.tool_instance_id },
        reason: reason ?? '',
      }
    );
    return toView(next, pod, access, user.id);
  },

  /** The host's recent score entries, newest first, for the undo list. */
  async recent(challengeId: string, user: AuthUser, limit = 50) {
    const { doc } = await managed(challengeId, user);
    const events = await ChallengeScoreEventModel.find({ challenge_id: doc._id })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .lean();
    return events.map((e) => ({
      id: e._id.toString(),
      tool_instance_id: e.tool_instance_id,
      competitor_id: e.competitor_id,
      event_type: e.event_type,
      value: e.value,
      round: e.round,
      voided: e.voided,
      void_reason: e.void_reason ?? '',
      created_at: (e as { created_at?: Date }).created_at?.toISOString() ?? '',
    }));
  },
};

export { toolOf, assertCompetitor, managed };
