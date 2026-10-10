import { GraphQLError } from 'graphql';
import { randomUUID } from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import type { AuthUser } from '@context';
import { isTrustedMediaUrl } from '@utils/url';
import type { QuizQuestion } from '../tools/challengeTool.config';
import { toolDefinition } from '../tools/challengeTool.catalogue';
import { ChallengeScoreEventModel, ChallengeSubmissionModel, ChallengeVoteModel } from './challengeLedger.model';
import { accessFor, loadPod, type ChallengeAccess, type PodRef } from './podChallenge.access';
import { ledgerCommit, loadChallenge } from './podChallenge.commit';
import { assertCompetitor, toolOf } from './podChallenge.scoring';
import { buzzScope, checkpointCode, doneItems } from './podChallenge.toolState';
import { competitorOfUser, toView } from './podChallenge.view';
import type { PodChallengeDoc } from './podChallenge.model';

/**
 * What attendees and competitors do themselves: check in at a checkpoint,
 * vote in a poll, answer the open quiz question, buzz, and submit their piece.
 *
 * Each is refused unless — at the moment it commits — the challenge is still
 * live (and, where it applies, the window still open). Quiz answers and buzzes
 * are INSERT-ONLY: the first one stands, so nobody can change an answer after
 * seeing the room or re-buzz to jump the queue.
 */

/** Ballots that are not per round live in round 0. */
const NO_ROUND = 0;
const MAX_CAPTION = 200;
const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO'] as const;

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function forbidden(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

interface Loaded {
  doc: PodChallengeDoc;
  pod: PodRef;
  access: ChallengeAccess;
}

async function load(challengeId: string, user: AuthUser): Promise<Loaded> {
  const doc = await loadChallenge(challengeId);
  const pod = await loadPod(doc.pod_id.toString());
  return { doc, pod, access: await accessFor(user, pod) };
}

function expectInput(toolType: string, input: string) {
  if (toolDefinition(toolType)?.input !== input) bad('This tool does not support that action');
}

/** The competitor a user plays as; taking part needs one. */
function myCompetitor(doc: PodChallengeDoc, user: AuthUser): string {
  const id = competitorOfUser(doc, user.id);
  if (!id) forbidden('Only a competitor in this challenge can do that — ask the host to add you to the roster');
  return id;
}

const windowOpen = (instanceId: string) => ({
  statuses: ['LIVE'] as const,
  filter: { tool_state: { $elemMatch: { instance_id: instanceId, voting_open: true } } },
});

/** Writes a ballot only if this voter has none in the scope yet. */
function insertOnce(session: ClientSession | undefined, key: Record<string, unknown>, set: Record<string, unknown>) {
  return ChallengeVoteModel.updateOne(key, { $setOnInsert: set }, { upsert: true, session });
}

export const podChallengePlayerTools = {
  /** A competitor checks in at a checkpoint with the code its QR link carries. */
  async checkpoint(challengeId: string, instanceId: string, code: string, user: AuthUser) {
    const { doc, pod, access } = await load(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'CHECKPOINT');
    if (doc.status !== 'LIVE') bad('This challenge is not live');
    const competitorId = myCompetitor(doc, user);
    const items = (tool.config.items as { key: string }[] | undefined) ?? [];
    const item = items.find((i) => checkpointCode(doc._id.toString(), instanceId, i.key) === code);
    if (!item) bad('This checkpoint code is not valid');
    const events = await ChallengeScoreEventModel.find({ challenge_id: doc._id, tool_instance_id: instanceId, voided: false })
      .select('tool_instance_id competitor_id event_type value item_key')
      .sort({ created_at: 1 })
      .lean();
    // Scanning the same code twice is one check-in, not two.
    if (doneItems(events, instanceId).get(competitorId)?.has(item.key)) return toView(doc, pod, access, user.id);
    const next = await ledgerCommit(
      doc,
      { statuses: ['LIVE'] },
      (session) =>
        ChallengeScoreEventModel.create(
          [
            {
              challenge_id: doc._id,
              tool_instance_id: instanceId,
              competitor_id: competitorId,
              event_type: 'SET',
              value: 1,
              item_key: item.key,
              round: doc.current_round,
              performed_by: user.id,
              client_event_id: randomUUID(),
              revision: doc.revision + 1,
            },
          ],
          { session }
        ),
      { signal: 'CHECKPOINT' }
    );
    return toView(next, pod, access, user.id);
  },

  /** An attendee picks one poll option; picking again moves their vote. */
  async poll(challengeId: string, instanceId: string, optionKey: string, user: AuthUser) {
    const { doc, pod, access } = await load(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'POLL');
    if (!doc.audience_interaction_enabled) forbidden('Audience participation is turned off');
    if (!access.isAttendee) forbidden('Only confirmed attendees of this pod can take part');
    const options = (tool.config.options as { key: string }[] | undefined) ?? [];
    if (!options.some((o) => o.key === optionKey)) bad('Unknown option');
    const key = { challenge_id: doc._id, tool_instance_id: instanceId, round: NO_ROUND, voter_id: user.id, kind: 'POLL', scope_key: '' };
    const next = await ledgerCommit(
      doc,
      { ...windowOpen(instanceId), filter: { ...windowOpen(instanceId).filter, audience_interaction_enabled: true } },
      (session) => ChallengeVoteModel.updateOne(key, { $set: { candidate_id: optionKey, value: 1 } }, { upsert: true, session }),
      { signal: 'POLL' }
    );
    return toView(next, pod, access, user.id);
  },

  /** A competitor answers the question the host has open. The first answer stands. */
  async answer(challengeId: string, instanceId: string, optionIndex: number, user: AuthUser) {
    const { doc, pod, access } = await load(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'QUIZ');
    const competitorId = myCompetitor(doc, user);
    const active = doc.tool_state.find((s) => s.instance_id === instanceId)?.active_item ?? '';
    const question = ((tool.config.questions as QuizQuestion[] | undefined) ?? []).find((q) => q.key === active);
    if (!question) bad('No question is open right now');
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) bad('Unknown answer');
    const key = { challenge_id: doc._id, tool_instance_id: instanceId, round: NO_ROUND, voter_id: user.id, kind: 'ANSWER', scope_key: question.key };
    const guard = windowOpen(instanceId);
    const next = await ledgerCommit(
      doc,
      // The answer only counts for the question that was open when it was sent.
      { ...guard, filter: { tool_state: { $elemMatch: { instance_id: instanceId, voting_open: true, active_item: question.key } } } },
      (session) => insertOnce(session, key, { candidate_id: competitorId, value: optionIndex }),
      { signal: 'ANSWER' }
    );
    return toView(next, pod, access, user.id);
  },

  /** A competitor buzzes. The server's clock orders the presses; the first one in a round stands. */
  async buzz(challengeId: string, instanceId: string, user: AuthUser) {
    const { doc, pod, access } = await load(challengeId, user);
    expectInput(toolOf(doc, instanceId).tool_type, 'BUZZ');
    const competitorId = myCompetitor(doc, user);
    const round = doc.tool_state.find((s) => s.instance_id === instanceId)?.buzz_round ?? 0;
    const key = { challenge_id: doc._id, tool_instance_id: instanceId, round: NO_ROUND, voter_id: user.id, kind: 'BUZZ', scope_key: buzzScope(round) };
    const next = await ledgerCommit(
      doc,
      { statuses: ['LIVE'], filter: { tool_state: { $elemMatch: { instance_id: instanceId, voting_open: true, buzz_round: round } } } },
      (session) => insertOnce(session, key, { candidate_id: competitorId, value: 1 }),
      { signal: 'BUZZ' }
    );
    return toView(next, pod, access, user.id);
  },

  /**
   * A competitor submits (or replaces) their piece; a host can submit on a
   * competitor's behalf. The media must already be in the media store.
   */
  async submit(
    challengeId: string,
    instanceId: string,
    input: { competitor_id?: string | null; media_url: string; media_type: string; caption?: string | null },
    user: AuthUser
  ) {
    const { doc, pod, access } = await load(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'SUBMIT');
    const competitorId = access.canManage && input.competitor_id ? input.competitor_id : myCompetitor(doc, user);
    assertCompetitor(doc, competitorId);
    const mediaType = input.media_type as (typeof MEDIA_TYPES)[number];
    if (!MEDIA_TYPES.includes(mediaType)) bad('Unsupported media type');
    const wanted = String(tool.config.media_kind ?? 'ANY');
    if (wanted !== 'ANY' && wanted !== mediaType) bad(`This challenge takes ${wanted.toLowerCase()} submissions only`);
    if (!isTrustedMediaUrl(input.media_url)) bad('Upload the file first — the link must come from the media store');
    const caption = tool.config.allow_caption === false ? '' : String(input.caption ?? '').trim().slice(0, MAX_CAPTION);
    const next = await ledgerCommit(
      doc,
      { statuses: ['SCHEDULED', 'LIVE'] },
      (session) =>
        ChallengeSubmissionModel.updateOne(
          { challenge_id: doc._id, tool_instance_id: instanceId, competitor_id: competitorId },
          { $set: { submitted_by: user.id, media_url: input.media_url, media_type: mediaType, caption } },
          { upsert: true, session }
        ),
      { actorId: user.id, action: 'SUBMISSION', newValue: { competitor_id: competitorId, media_type: mediaType } }
    );
    return toView(next, pod, access, user.id);
  },

  /** Removes an entry: its own competitor before the end, or a host at any time before publishing. */
  async removeEntry(entryId: string, user: AuthUser) {
    if (!Types.ObjectId.isValid(entryId)) bad('Invalid entry id');
    const entry = await ChallengeSubmissionModel.findById(entryId).lean();
    if (!entry) bad('Entry not found');
    const { doc, pod, access } = await load(entry.challenge_id.toString(), user);
    if (!access.canManage && competitorOfUser(doc, user.id) !== entry.competitor_id) {
      forbidden('You can only remove your own submission');
    }
    const next = await ledgerCommit(
      doc,
      { statuses: access.canManage ? ['SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED'] : ['SCHEDULED', 'LIVE'] },
      (session) => ChallengeSubmissionModel.deleteOne({ _id: entry._id }, { session }),
      { actorId: user.id, action: 'SUBMISSION_REMOVED', oldValue: { competitor_id: entry.competitor_id, media_url: entry.media_url } }
    );
    return toView(next, pod, access, user.id);
  },
};
