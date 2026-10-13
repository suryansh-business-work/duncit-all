import { act, renderHook } from '@testing-library/react-native';

import { useHostChallengeActions } from '@/hooks/useHostChallengeActions';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@duncit/user-core', () => ({ makeDeviceId: () => 'evt-1' }));

const mockRequest = graphqlRequest as jest.Mock;
const AUTH = { auth: true };
const next = { id: 'ch-1', revision: 4 };

function setup() {
  const adopt = jest.fn();
  const hook = renderHook(() => useHostChallengeActions('ch-1', adopt));
  return { adopt, ...hook };
}

beforeEach(() => mockRequest.mockReset());

// Each action: [method, args, response key, expected variables]
const cases: [string, unknown[], string, Record<string, unknown>][] = [
  [
    'toggle',
    ['voting_enabled', true],
    'updatePodChallengeSettings',
    { id: 'ch-1', input: { voting_enabled: true } },
  ],
  [
    'roster',
    [{ competitors: [{ competitor_id: null, name: 'Asha', user_id: 'u1' }] }],
    'setPodChallengeRoster',
    { id: 'ch-1', input: { competitors: [{ competitor_id: null, name: 'Asha', user_id: 'u1' }] } },
  ],
  ['transition', ['START'], 'transitionPodChallenge', { id: 'ch-1', action: 'START' }],
  [
    'score',
    ['tool-1', 'c-1', 7],
    'recordPodChallengeScore',
    {
      input: {
        challenge_id: 'ch-1',
        tool_instance_id: 'tool-1',
        competitor_id: 'c-1',
        value: 7,
        client_event_id: 'evt-1',
      },
    },
  ],
  ['voidScore', ['e-1', 'typo'], 'voidPodChallengeScore', { eventId: 'e-1', reason: 'typo' }],
  [
    'clock',
    ['tool-1', 'PAUSE'],
    'controlPodChallengeClock',
    { id: 'ch-1', toolInstanceId: 'tool-1', action: 'PAUSE' },
  ],
  [
    'voting',
    ['tool-1', false],
    'setPodChallengeVoting',
    { id: 'ch-1', toolInstanceId: 'tool-1', open: false },
  ],
  ['round', [3], 'setPodChallengeRound', { id: 'ch-1', round: 3 }],
  ['publish', ['final'], 'publishPodChallengeResult', { id: 'ch-1', reason: 'final' }],
  [
    'item',
    ['tool-1', 'c-1', 'k1', true],
    'setPodChallengeItem',
    { id: 'ch-1', toolInstanceId: 'tool-1', competitorId: 'c-1', itemKey: 'k1', done: true },
  ],
  [
    'quiz',
    ['tool-1', null],
    'controlPodChallengeQuiz',
    { id: 'ch-1', toolInstanceId: 'tool-1', questionKey: null },
  ],
  [
    'buzzer',
    ['tool-1', true],
    'controlPodChallengeBuzzer',
    { id: 'ch-1', toolInstanceId: 'tool-1', arm: true },
  ],
  [
    'pick',
    ['tool-1', true],
    'pickPodChallengeRandom',
    { id: 'ch-1', toolInstanceId: 'tool-1', reset: true },
  ],
];

describe('useHostChallengeActions', () => {
  it.each(cases)(
    '%s sends the right variables and adopts the answer',
    async (name, args, key, vars) => {
      mockRequest.mockResolvedValue({ [key]: next });
      const { result, adopt } = setup();
      let ok: boolean | undefined;
      await act(async () => {
        const action = (
          result.current as unknown as Record<string, (...a: unknown[]) => Promise<boolean>>
        )[name];
        if (!action) throw new Error(`no action ${name}`);
        ok = await action(...args);
      });
      expect(ok).toBe(true);
      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(mockRequest.mock.calls[0][1]).toEqual(vars);
      expect(mockRequest.mock.calls[0][2]).toEqual(AUTH);
      expect(adopt).toHaveBeenCalledWith(next);
      expect(result.current.error).toBe('');
      expect(result.current.busy).toBe(false);
    },
  );

  it('notify sends the notice and adopts nothing', async () => {
    mockRequest.mockResolvedValue({ sendPodChallengeNotice: { sent: 3 } });
    const { result, adopt } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.notify('RESULT', true);
    });
    expect(ok).toBe(true);
    expect(mockRequest.mock.calls[0][1]).toEqual({ id: 'ch-1', kind: 'RESULT', retryFailed: true });
    expect(adopt).not.toHaveBeenCalled();
  });

  it('shows the server reason on failure and clears it on demand', async () => {
    mockRequest.mockRejectedValue(new Error('Round is locked'));
    const { result, adopt } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.round(2);
    });
    expect(ok).toBe(false);
    expect(adopt).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Round is locked');
    expect(result.current.busy).toBe(false);
    act(() => result.current.clearError());
    expect(result.current.error).toBe('');
  });

  it('is busy while a request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    mockRequest.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = setup();
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.transition('STOP');
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      resolve({ transitionPodChallenge: null });
      await pending;
    });
    expect(result.current.busy).toBe(false);
  });
});
