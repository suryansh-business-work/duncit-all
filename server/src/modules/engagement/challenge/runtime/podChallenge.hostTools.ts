import { GraphQLError } from 'graphql';
import { randomInt, randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import type { AuthUser } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import type { QuizQuestion } from '../tools/challengeTool.config';
import { toolDefinition } from '../tools/challengeTool.catalogue';
import { ChallengeScoreEventModel } from './challengeLedger.model';
import { commit, ledgerCommit } from './podChallenge.commit';
import { assertCompetitor, managed, scoringWindow, toolOf } from './podChallenge.scoring';
import { toView } from './podChallenge.view';
import { challengeLiveLink } from './podChallenge.notify';
import { checkpointCode } from './podChallenge.toolState';

/**
 * Host controls for the tools that are run rather than scored by hand: ticking
 * a task or checkpoint, opening a quiz question, arming the buzzer and drawing
 * a random pick. Each is a guarded commit like every other challenge write.
 */

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

const forInstance = (instanceId: string) => [{ 's.instance_id': instanceId }];

/** Fails unless the instance is fed the way the caller expects. */
function expectInput(toolType: string, ...inputs: string[]) {
  if (!inputs.includes(toolDefinition(toolType)?.input ?? 'NONE')) bad('This tool does not support that action');
}

export const podChallengeHostTools = {
  /** Ticks (or unticks) one task or checkpoint for a competitor. */
  async setItem(
    challengeId: string,
    instanceId: string,
    competitorId: string,
    itemKey: string,
    done: boolean,
    reason: string | null | undefined,
    user: AuthUser
  ) {
    const { doc, pod, access } = await managed(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'CHECK', 'CHECKPOINT');
    assertCompetitor(doc, competitorId);
    const items = (tool.config.items as { key: string }[] | undefined) ?? [];
    if (!items.some((i) => i.key === itemKey)) bad('Unknown task');
    const status = scoringWindow(doc, access, reason);
    const next = await ledgerCommit(
      doc,
      { statuses: [status] },
      (session) =>
        ChallengeScoreEventModel.create(
          [
            {
              challenge_id: doc._id,
              tool_instance_id: instanceId,
              competitor_id: competitorId,
              event_type: 'SET',
              value: done ? 1 : 0,
              item_key: itemKey,
              round: doc.current_round,
              performed_by: user.id,
              client_event_id: randomUUID(),
              revision: doc.revision + 1,
            },
          ],
          { session }
        ),
      status === 'LIVE'
        ? { signal: 'ITEM' }
        : { actorId: user.id, action: 'ITEM_CORRECTION', newValue: { competitorId, itemKey, done }, reason: reason ?? '' }
    );
    return toView(next, pod, access, user.id);
  },

  /**
   * The link (and its QR image) to post at each checkpoint. A competitor who
   * opens it while signed in is checked in there; the code in it is the only
   * thing that proves they reached the spot, so hosts alone can read it.
   */
  async checkpointLinks(challengeId: string, instanceId: string, user: AuthUser) {
    const { doc } = await managed(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'CHECKPOINT');
    const { mwebUrl } = await getUrlConfigs();
    const base = challengeLiveLink(mwebUrl, doc);
    const items = (tool.config.items as { key: string; label: string }[] | undefined) ?? [];
    return Promise.all(
      items.map(async (item) => {
        const code = checkpointCode(doc._id.toString(), instanceId, item.key);
        const url = `${base}?checkpoint=${encodeURIComponent(`${instanceId}.${code}`)}`;
        return { item_key: item.key, label: item.label, url, qr_data_url: await QRCode.toDataURL(url, { width: 512, margin: 1 }) };
      })
    );
  },

  /** Opens one quiz question for answers, or closes the open one (`questionKey` null). */
  async quiz(challengeId: string, instanceId: string, questionKey: string | null | undefined, user: AuthUser) {
    const { doc, pod, access } = await managed(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'QUIZ');
    const questions = (tool.config.questions as QuizQuestion[] | undefined) ?? [];
    if (questionKey && !questions.some((q) => q.key === questionKey)) bad('Unknown question');
    if (questionKey && doc.status !== 'LIVE') bad('A question can only open while the challenge is live');
    const set = questionKey
      ? { 'tool_state.$[s].active_item': questionKey, 'tool_state.$[s].voting_open': true }
      : { 'tool_state.$[s].voting_open': false };
    const next = await commit(
      doc,
      { statuses: questionKey ? ['LIVE'] : ['LIVE', 'PAUSED'], arrayFilters: forInstance(instanceId) },
      { $set: set },
      { actorId: user.id, action: questionKey ? 'QUIZ_OPEN' : 'QUIZ_CLOSE', newValue: { instance_id: instanceId, question: questionKey ?? '' } }
    );
    return toView(next, pod, access, user.id);
  },

  /** Arms the buzzer for a fresh round, or disarms it. Presses are ordered within one arming. */
  async buzzer(challengeId: string, instanceId: string, arm: boolean, user: AuthUser) {
    const { doc, pod, access } = await managed(challengeId, user);
    expectInput(toolOf(doc, instanceId).tool_type, 'BUZZ');
    if (arm && doc.status !== 'LIVE') bad('The buzzer can only be armed while the challenge is live');
    const next = await commit(
      doc,
      { statuses: arm ? ['LIVE'] : ['LIVE', 'PAUSED'], arrayFilters: forInstance(instanceId) },
      arm
        ? { $set: { 'tool_state.$[s].voting_open': true }, $inc: { 'tool_state.$[s].buzz_round': 1 } }
        : { $set: { 'tool_state.$[s].voting_open': false } },
      { actorId: user.id, action: arm ? 'BUZZER_ARM' : 'BUZZER_DISARM', newValue: { instance_id: instanceId } }
    );
    return toView(next, pod, access, user.id);
  },

  /**
   * Draws one competitor at random on the server (never on a client, where it
   * could be steered), or clears the draw so far.
   */
  async pick(challengeId: string, instanceId: string, reset: boolean, user: AuthUser) {
    const { doc, pod, access } = await managed(challengeId, user);
    const tool = toolOf(doc, instanceId);
    expectInput(tool.tool_type, 'PICK');
    const picked = doc.tool_state.find((s) => s.instance_id === instanceId)?.picked ?? [];
    const guard = { statuses: ['LIVE', 'PAUSED'] as const, arrayFilters: forInstance(instanceId) };
    if (reset) {
      const cleared = await commit(doc, guard, { $set: { 'tool_state.$[s].picked': [] } }, { actorId: user.id, action: 'PICK_RESET' });
      return toView(cleared, pod, access, user.id);
    }
    const pool = doc.competitors
      .map((c) => c.competitor_id)
      .filter((id) => tool.config.without_repeats !== true || !picked.includes(id));
    if (!pool.length) bad('Everyone has been picked — reset the picker to draw again');
    const chosen = pool[randomInt(pool.length)];
    const next = await commit(
      doc,
      // The draw is only valid against the picks it was made from.
      { ...guard, filter: { tool_state: { $elemMatch: { instance_id: instanceId, picked: { $size: picked.length } } } } },
      { $push: { 'tool_state.$[s].picked': chosen } },
      { actorId: user.id, action: 'PICK', newValue: { instance_id: instanceId, competitor_id: chosen } }
    );
    return toView(next, pod, access, user.id);
  },
};
