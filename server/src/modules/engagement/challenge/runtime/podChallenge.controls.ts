import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { toolDefinition } from '../tools/challengeTool.catalogue';
import { commit } from './podChallenge.commit';
import { managed, toolOf } from './podChallenge.scoring';
import { toView } from './podChallenge.view';

/**
 * Host controls for a running challenge's live state: a tool's clock, a vote's
 * open/closed window, and the current round. Each write targets ONE element of
 * `tool_state` by its instance id, so starting a clock never overwrites a vote
 * window someone opened a moment earlier.
 */

export type ClockAction = 'START' | 'STOP' | 'RESET';

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

const forInstance = (instanceId: string) => [{ 's.instance_id': instanceId }];

export const podChallengeControls = {
  async clock(challengeId: string, instanceId: string, action: ClockAction, user: AuthUser) {
    const { doc, pod, access } = await managed(challengeId, user);
    if (toolOf(doc, instanceId).tool_type !== 'TIMER') bad('This tool has no clock');
    const state = doc.tool_state.find((s) => s.instance_id === instanceId);
    const now = new Date();
    let set: Record<string, unknown>;
    if (action === 'START') {
      if (doc.status !== 'LIVE') bad('The clock can only run while the challenge is live');
      if (state?.clock_running) return toView(doc, pod, access, user.id);
      set = { 'tool_state.$[s].clock_running': true, 'tool_state.$[s].clock_started_at': now };
    } else if (action === 'STOP') {
      if (!state?.clock_running || !state.clock_started_at) return toView(doc, pod, access, user.id);
      const elapsed = (state.clock_elapsed_ms ?? 0) + (now.getTime() - new Date(state.clock_started_at).getTime());
      set = {
        'tool_state.$[s].clock_running': false,
        'tool_state.$[s].clock_started_at': null,
        'tool_state.$[s].clock_elapsed_ms': elapsed,
      };
    } else {
      set = {
        'tool_state.$[s].clock_running': false,
        'tool_state.$[s].clock_started_at': null,
        'tool_state.$[s].clock_elapsed_ms': 0,
      };
    }
    const next = await commit(
      doc,
      { statuses: ['LIVE', 'PAUSED'], arrayFilters: forInstance(instanceId) },
      { $set: set },
      { actorId: user.id, action: `CLOCK_${action}`, newValue: { instance_id: instanceId } }
    );
    return toView(next, pod, access, user.id);
  },

  async voting(challengeId: string, instanceId: string, open: boolean, user: AuthUser) {
    const { doc, pod, access } = await managed(challengeId, user);
    const input = toolDefinition(toolOf(doc, instanceId).tool_type)?.input;
    if (input !== 'VOTE' && input !== 'RATE' && input !== 'POLL') bad('This tool does not take votes');
    if (open && doc.status !== 'LIVE') bad('Voting can only open while the challenge is live');
    const next = await commit(
      doc,
      { statuses: open ? ['LIVE'] : ['LIVE', 'PAUSED'], arrayFilters: forInstance(instanceId) },
      { $set: { 'tool_state.$[s].voting_open': open } },
      { actorId: user.id, action: open ? 'VOTING_OPEN' : 'VOTING_CLOSE', newValue: { instance_id: instanceId } }
    );
    return toView(next, pod, access, user.id);
  },

  async round(challengeId: string, round: number, user: AuthUser) {
    const { doc, pod, access } = await managed(challengeId, user);
    const manager = doc.tools.find((t) => t.tool_type === 'ROUND_MANAGER');
    if (!manager) bad('This challenge has no rounds');
    const max = Number((manager.config as Record<string, unknown>).rounds ?? 1);
    if (!Number.isInteger(round) || round < 1 || round > max) bad(`Round must be between 1 and ${max}`);
    const next = await commit(
      doc,
      { statuses: ['LIVE', 'PAUSED'] },
      { $set: { current_round: round } },
      { actorId: user.id, action: 'ROUND', oldValue: { round: doc.current_round }, newValue: { round } }
    );
    return toView(next, pod, access, user.id);
  },
};
