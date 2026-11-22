/**
 * The Ask Duncit thread model both apps render: an optimistic question, the
 * streamed answer folding in delta by delta, tools and approvals updating in
 * place, and the stored message replacing the streamed copy at the end.
 */
import { describe, expect, it } from 'vitest';
import {
  acceptTurn,
  actionStatusKey,
  addOptimisticQuestion,
  alertText,
  applyActionEvent,
  applyDelta,
  applyFailure,
  applyFinal,
  applyToolEvent,
  canDecide,
  emptyThread,
  errorKey,
  handoverTeamKey,
  isAskDuncitHandoverTeam,
  isNearBottom,
  pageContextFromPath,
  prependOlder,
  rejectTurn,
  roleLabelKey,
  suggestionText,
  tempMessageId,
  toolStatusKey,
  unavailableKey,
  voiceErrorKey,
  type AskDuncitActionView,
  type AskDuncitMessageView,
} from '../src/ask-duncit';

const accepted = { conversation_id: 'c1', user_message_id: 'u1', message_id: 'a1', status: 'STREAMING' };

function started() {
  return acceptTurn(addOptimisticQuestion(emptyThread(), 'tmp', 'Show my pods'), 'tmp', accepted);
}

const action = (over: Partial<AskDuncitActionView> = {}): AskDuncitActionView => ({
  id: 'x1',
  tool: 'pods_follow_pod',
  tool_title: 'Follow pod',
  risk: 'WRITE',
  args_preview: '{}',
  status: 'PENDING',
  error_message: '',
  can_rollback: false,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  ...over,
});

describe('a turn', () => {
  it('shows the question at once, then swaps in its real id and an answer placeholder', () => {
    const state = started();
    expect(state.conversationId).toBe('c1');
    expect(state.messages.map((m) => [m.id, m.role, m.status])).toEqual([
      ['u1', 'user', 'COMPLETE'],
      ['a1', 'assistant', 'STREAMING'],
    ]);
    expect(state.streamingId).toBe('a1');
  });

  it('marks a blocked turn complete with its code and nothing streaming', () => {
    const state = acceptTurn(addOptimisticQuestion(emptyThread(), 'tmp', 'x'), 'tmp', { ...accepted, status: 'BLOCKED' });
    expect(state.streamingId).toBeNull();
    expect(state.messages[1]).toMatchObject({ status: 'COMPLETE', error_code: 'INJECTION_BLOCKED' });
  });

  it('drops the optimistic question when the send is refused', () => {
    const state = rejectTurn(addOptimisticQuestion(emptyThread(), 'tmp', 'x'), 'tmp');
    expect(state.messages).toEqual([]);
  });

  it('appends streamed text in order and ignores deltas for unknown messages', () => {
    let state = applyDelta(started(), { message_id: 'a1', text: 'You have ' });
    state = applyDelta(state, { message_id: 'a1', text: '2 pods.' });
    expect(state.messages[1].content).toBe('You have 2 pods.');
    expect(applyDelta(state, { message_id: 'nope', text: 'x' })).toBe(state);
  });

  it('replaces a running tool line with its finished status', () => {
    let state = applyToolEvent(started(), { message_id: 'a1', name: 'call_tool', status: 'RUNNING' });
    state = applyToolEvent(state, { message_id: 'a1', name: 'pods_my_pods', title: 'My pods', status: 'OK' });
    state = applyToolEvent(state, { message_id: 'a1', name: 'call_tool', status: 'OK' });
    expect(state.messages[1].tool_calls.map((c) => `${c.name}:${c.status}`)).toEqual(['pods_my_pods:OK', 'call_tool:OK']);
  });

  it('attaches a new proposal to the streaming answer and updates it in place later', () => {
    let state = applyActionEvent(started(), action());
    expect(state.messages[1].actions).toHaveLength(1);
    state = { ...state, streamingId: null };
    state = applyActionEvent(state, action({ status: 'EXECUTED', can_rollback: true }));
    expect(state.messages[1].actions).toEqual([expect.objectContaining({ status: 'EXECUTED', can_rollback: true })]);
  });

  it('lets the stored message replace the streamed copy and ends streaming', () => {
    const stored: AskDuncitMessageView = { ...started().messages[1], content: 'Final', status: 'COMPLETE' };
    const state = applyFinal(applyDelta(started(), { message_id: 'a1', text: 'Fin' }), stored);
    expect(state.messages[1]).toMatchObject({ content: 'Final', status: 'COMPLETE' });
    expect(state.streamingId).toBeNull();
  });

  it('marks a failure with its code', () => {
    const state = applyFailure(started(), { message_id: 'a1', code: 'UPSTREAM' });
    expect(state.messages[1]).toMatchObject({ status: 'FAILED', error_code: 'UPSTREAM' });
    expect(state.streamingId).toBeNull();
  });

  it('prepends older messages without duplicating ones already shown', () => {
    const older = [{ ...started().messages[0], id: 'old' }, started().messages[0]];
    const state = prependOlder(started(), older, true);
    expect(state.messages.map((m) => m.id)).toEqual(['old', 'u1', 'a1']);
    expect(state.hasMore).toBe(true);
  });
});

describe('a turn alongside other messages', () => {
  const second = (state: ReturnType<typeof started>) =>
    acceptTurn(addOptimisticQuestion(state, 'tmp2', 'And clubs?'), 'tmp2', { conversation_id: 'c1', user_message_id: 'u2', message_id: 'a2', status: 'STREAMING' });

  it('leaves earlier messages alone and never adds the same answer twice', () => {
    const state = second(started());
    expect(state.messages.map((m) => m.id)).toEqual(['u1', 'a1', 'u2', 'a2']);
    const again = acceptTurn(state, 'gone', { conversation_id: 'c1', user_message_id: 'u2', message_id: 'a2', status: 'STREAMING' });
    expect(again.messages.map((m) => m.id)).toEqual(['u1', 'a1', 'u2', 'a2']);
  });

  it('drops a proposal that belongs to no message on screen and nothing is streaming', () => {
    const idle = { ...started(), streamingId: null };
    expect(applyActionEvent(idle, action())).toBe(idle);
  });

  it('updates one proposal without touching its neighbour', () => {
    let state = applyActionEvent(started(), action());
    state = applyActionEvent(state, action({ id: 'x2' }));
    state = applyActionEvent(state, action({ id: 'x2', status: 'REJECTED' }));
    expect(state.messages[1].actions.map((a) => `${a.id}:${a.status}`)).toEqual(['x1:PENDING', 'x2:REJECTED']);
  });

  it('appends a stored message it has not shown yet and keeps the other answer streaming', () => {
    const state = second(started());
    const stored: AskDuncitMessageView = { ...state.messages[1], id: 'late', content: 'Late', status: 'COMPLETE' };
    const next = applyFinal(state, stored);
    expect(next.messages.at(-1)).toMatchObject({ id: 'late', content: 'Late' });
    expect(next.streamingId).toBe('a2');
  });

  it('reports a failure without a code as INTERNAL and keeps the other answer streaming', () => {
    const next = applyFailure(second(started()), { message_id: 'a1' });
    expect(next.messages[1]).toMatchObject({ status: 'FAILED', error_code: 'INTERNAL' });
    expect(next.streamingId).toBe('a2');
  });
});

describe('page context', () => {
  it('reads the entity on screen from the path', () => {
    expect(pageContextFromPath('/pod/6650abc?tab=chat')).toEqual({ route: '/pod/6650abc', entity_type: 'POD', entity_id: '6650abc' });
    expect(pageContextFromPath('/club/yoga-indiranagar')).toMatchObject({ entity_type: 'CLUB', entity_id: 'yoga-indiranagar' });
    expect(pageContextFromPath('/venues/v1')).toMatchObject({ entity_type: 'VENUE', entity_id: 'v1' });
    expect(pageContextFromPath('/u/aarav')).toMatchObject({ entity_type: 'PROFILE', entity_id: 'aarav' });
  });

  it('knows the profile and wallet pages, and nothing elsewhere', () => {
    expect(pageContextFromPath('/profile/edit')).toMatchObject({ entity_type: 'PROFILE', entity_id: '' });
    expect(pageContextFromPath('/wallet#history')).toEqual({ route: '/wallet', entity_type: 'WALLET', entity_id: '' });
    expect(pageContextFromPath('/')).toEqual({ route: '/', entity_type: '', entity_id: '' });
    expect(pageContextFromPath(null).route).toBe('');
  });
});

describe('copy keys and small rules', () => {
  const t = (key: string) => (key === 'askDuncit.alerts.healthRed' ? 'Health is {score}/100 ({band})' : `T:${key}`);

  it('builds localization keys for roles, statuses and codes, with safe fallbacks', () => {
    expect(roleLabelKey('HOST')).toBe('askDuncit.roles.HOST');
    expect(actionStatusKey('PENDING')).toBe('askDuncit.actionStatus.PENDING');
    expect(errorKey('UPSTREAM')).toBe('askDuncit.errors.UPSTREAM');
    expect(errorKey('SOMETHING_NEW')).toBe('askDuncit.errors.INTERNAL');
    expect(unavailableKey('KILL_SWITCH')).toBe('askDuncit.unavailable.KILL_SWITCH');
    expect(unavailableKey(null)).toBe('askDuncit.unavailable.DISABLED');
  });

  it('prefers an operator-written label over the localized key', () => {
    expect(suggestionText({ label: null, label_key: null }, t)).toBe('');
    expect(suggestionText({ label: 'Custom', label_key: 'k' }, t)).toBe('Custom');
    expect(suggestionText({ label: null, label_key: 'k' }, t)).toBe('T:k');
  });

  it('fills alert placeholders from params and leaves unknown ones visible', () => {
    expect(alertText({ label_key: 'askDuncit.alerts.healthRed', params: '{"score":42}' }, t)).toBe('Health is 42/100 ({band})');
    expect(alertText({ label_key: 'askDuncit.alerts.healthRed', params: 'broken' }, t)).toBe('Health is {score}/100 ({band})');
    expect(alertText({ label_key: 'askDuncit.alerts.healthRed', params: '' }, t)).toBe('Health is {score}/100 ({band})');
    expect(alertText({ label_key: 'askDuncit.alerts.healthRed', params: '{"score":{"nested":1},"band":"RED"}' }, t)).toBe('Health is {score}/100 (RED)');
  });

  it('maps tool, voice and handover codes to keys, unknown ones to a safe default', () => {
    expect(toolStatusKey('DENIED')).toBe('askDuncit.toolStatus.DENIED');
    expect(toolStatusKey('NEW_STATUS')).toBe('askDuncit.toolStatus.OK');
    expect(voiceErrorKey('PERMISSION')).toBe('askDuncit.voice.error.PERMISSION');
    expect(voiceErrorKey('')).toBe('askDuncit.voice.error.FAILED');
    expect(handoverTeamKey('ADMIN')).toBe('askDuncit.handover.team.ADMIN');
    expect(handoverTeamKey('FINANCE')).toBe('askDuncit.handover.team.SUPPORT');
    expect(roleLabelKey('NOBODY')).toBe('askDuncit.roles.MEMBER');
    expect(actionStatusKey('SOMETHING')).toBe('askDuncit.actionStatus.PENDING');
  });

  it('accepts only the three handover teams', () => {
    expect(['SUPPORT', 'ADMIN', 'OPERATIONS'].every(isAskDuncitHandoverTeam)).toBe(true);
    expect(isAskDuncitHandoverTeam('FINANCE')).toBe(false);
    expect(isAskDuncitHandoverTeam(7)).toBe(false);
  });

  it('allows a decision only on a pending, unexpired proposal', () => {
    expect(canDecide(action())).toBe(true);
    expect(canDecide(action({ status: 'EXECUTED' }))).toBe(false);
    expect(canDecide(action({ expires_at: new Date(Date.now() - 1).toISOString() }))).toBe(false);
  });

  it('treats the last 80px as the bottom', () => {
    expect(isNearBottom(80)).toBe(true);
    expect(isNearBottom(81)).toBe(false);
  });

  it('mints distinct temporary ids', () => {
    expect(tempMessageId()).not.toBe(tempMessageId());
  });
});

describe('bytesToBase64', () => {
  const enc = (text: string) => new TextEncoder().encode(text);

  it('matches standard base64 for every padding length', async () => {
    const { bytesToBase64 } = await import('../src/ask-duncit');
    expect(bytesToBase64(enc(''))).toBe('');
    expect(bytesToBase64(enc('f'))).toBe('Zg==');
    expect(bytesToBase64(enc('fo'))).toBe('Zm8=');
    expect(bytesToBase64(enc('foo'))).toBe('Zm9v');
    expect(bytesToBase64(enc('नमस्ते Duncit'))).toBe(Buffer.from('नमस्ते Duncit').toString('base64'));
  });

  it('encodes arbitrary binary bytes', async () => {
    const { bytesToBase64 } = await import('../src/ask-duncit');
    const bytes = Uint8Array.from([0, 255, 128, 1, 2, 254, 77]);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });
});
