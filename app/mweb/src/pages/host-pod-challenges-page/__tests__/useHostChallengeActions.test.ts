import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useHostChallengeActions } from '../useHostChallengeActions';
import {
  CONTROL_POD_CHALLENGE_CLOCK,
  POD_CHALLENGE_SCORE_LOG,
  PUBLISH_POD_CHALLENGE_RESULT,
  RECORD_POD_CHALLENGE_SCORE,
  SET_POD_CHALLENGE_ROSTER,
  SET_POD_CHALLENGE_ROUND,
  SET_POD_CHALLENGE_VOTING,
  TRANSITION_POD_CHALLENGE,
  UPDATE_POD_CHALLENGE_SETTINGS,
  VOID_POD_CHALLENGE_SCORE,
} from '../queries';
import { CONTROL_POD_CHALLENGE_BUZZER, CONTROL_POD_CHALLENGE_QUIZ, PICK_POD_CHALLENGE_RANDOM, SET_POD_CHALLENGE_ITEM } from '../toolQueries';

const h = vi.hoisted(() => ({ useMutation: vi.fn(), error: vi.fn() }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useMutation: h.useMutation }));
vi.mock('../../../components/notify', () => ({ notifyError: h.error, notifySuccess: vi.fn() }));
vi.mock('@duncit/user-core', async (orig) => ({ ...(await orig<object>()), makeDeviceId: () => 'device-evt-1' }));

type Fn = ReturnType<typeof vi.fn>;

const DOCS = [
  UPDATE_POD_CHALLENGE_SETTINGS,
  SET_POD_CHALLENGE_ROSTER,
  TRANSITION_POD_CHALLENGE,
  RECORD_POD_CHALLENGE_SCORE,
  VOID_POD_CHALLENGE_SCORE,
  CONTROL_POD_CHALLENGE_CLOCK,
  SET_POD_CHALLENGE_VOTING,
  SET_POD_CHALLENGE_ROUND,
  PUBLISH_POD_CHALLENGE_RESULT,
  SET_POD_CHALLENGE_ITEM,
  CONTROL_POD_CHALLENGE_QUIZ,
  CONTROL_POD_CHALLENGE_BUZZER,
  PICK_POD_CHALLENGE_RANDOM,
] as const;

let fns: Map<unknown, Fn>;
let loading: Set<unknown>;
let options: Map<unknown, unknown>;

const setup = () => {
  h.useMutation.mockImplementation((doc: unknown, opts?: unknown) => {
    options.set(doc, opts);
    return [fns.get(doc), { loading: loading.has(doc) }];
  });
  return renderHook(() => useHostChallengeActions('ch1')).result;
};

beforeEach(() => {
  vi.clearAllMocks();
  fns = new Map(DOCS.map((doc) => [doc, vi.fn().mockResolvedValue({})]));
  loading = new Set();
  options = new Map();
});

describe('useHostChallengeActions', () => {
  it('sends every action with the challenge id and reports success', async () => {
    const result = setup();
    await act(async () => {
      expect(await result.current.settings({ enabled: true } as never)).toBe(true);
      expect(await result.current.roster({ competitors: [] } as never)).toBe(true);
      expect(await result.current.transition('START')).toBe(true);
      expect(await result.current.voidScore('e1', 'typo')).toBe(true);
      expect(await result.current.clock('t1', 'START')).toBe(true);
      expect(await result.current.voting('t2', true)).toBe(true);
      expect(await result.current.round(3)).toBe(true);
      expect(await result.current.publish('final')).toBe(true);
      expect(await result.current.item('t3', 'c1', 'k1', true)).toBe(true);
      expect(await result.current.quiz('t4', null)).toBe(true);
      expect(await result.current.buzzer('t5', false)).toBe(true);
      expect(await result.current.pick('t6', true)).toBe(true);
    });
    const call = (doc: unknown) => fns.get(doc)?.mock.calls[0][0];
    expect(call(UPDATE_POD_CHALLENGE_SETTINGS)).toEqual({ variables: { id: 'ch1', input: { enabled: true } } });
    expect(call(SET_POD_CHALLENGE_ROSTER)).toEqual({ variables: { id: 'ch1', input: { competitors: [] } } });
    expect(call(TRANSITION_POD_CHALLENGE)).toEqual({ variables: { id: 'ch1', action: 'START' } });
    expect(call(VOID_POD_CHALLENGE_SCORE)).toEqual({ variables: { eventId: 'e1', reason: 'typo' } });
    expect(call(CONTROL_POD_CHALLENGE_CLOCK)).toEqual({ variables: { id: 'ch1', toolInstanceId: 't1', action: 'START' } });
    expect(call(SET_POD_CHALLENGE_VOTING)).toEqual({ variables: { id: 'ch1', toolInstanceId: 't2', open: true } });
    expect(call(SET_POD_CHALLENGE_ROUND)).toEqual({ variables: { id: 'ch1', round: 3 } });
    expect(call(PUBLISH_POD_CHALLENGE_RESULT)).toEqual({ variables: { id: 'ch1', reason: 'final' } });
    expect(call(SET_POD_CHALLENGE_ITEM)).toEqual({ variables: { id: 'ch1', toolInstanceId: 't3', competitorId: 'c1', itemKey: 'k1', done: true } });
    expect(call(CONTROL_POD_CHALLENGE_QUIZ)).toEqual({ variables: { id: 'ch1', toolInstanceId: 't4', questionKey: null } });
    expect(call(CONTROL_POD_CHALLENGE_BUZZER)).toEqual({ variables: { id: 'ch1', toolInstanceId: 't5', arm: false } });
    expect(call(PICK_POD_CHALLENGE_RANDOM)).toEqual({ variables: { id: 'ch1', toolInstanceId: 't6', reset: true } });
  });

  it('records a score with a fresh event id so a retried request is recorded once', async () => {
    const result = setup();
    await act(async () => {
      expect(await result.current.score('t1', 'c2', 7, 'bonus')).toBe(true);
    });
    expect(fns.get(RECORD_POD_CHALLENGE_SCORE)?.mock.calls[0][0]).toEqual({
      variables: {
        input: { challenge_id: 'ch1', tool_instance_id: 't1', competitor_id: 'c2', value: 7, client_event_id: 'device-evt-1', reason: 'bonus' },
      },
    });
  });

  it('refreshes the score log after a score or a void', () => {
    setup();
    const expected = { refetchQueries: [{ query: POD_CHALLENGE_SCORE_LOG, variables: { id: 'ch1' } }] };
    expect(options.get(RECORD_POD_CHALLENGE_SCORE)).toEqual(expected);
    expect(options.get(VOID_POD_CHALLENGE_SCORE)).toEqual(expected);
  });

  it('shows the server reason and reports false when an action is refused', async () => {
    fns.get(TRANSITION_POD_CHALLENGE)?.mockRejectedValue(new Error('Cannot start without competitors'));
    const result = setup();
    let ok = true;
    await act(async () => {
      ok = await result.current.transition('START');
    });
    expect(ok).toBe(false);
    expect(h.error).toHaveBeenCalledWith('Cannot start without competitors');
  });

  it('is busy while any control mutation runs, but not for score, void or item saves', () => {
    loading.add(PICK_POD_CHALLENGE_RANDOM);
    expect(setup().current.busy).toBe(true);
    loading = new Set([RECORD_POD_CHALLENGE_SCORE]);
    const scoring = setup();
    expect(scoring.current.busy).toBe(false);
    expect(scoring.current.scoring).toBe(true);
  });

  it.each([
    [UPDATE_POD_CHALLENGE_SETTINGS],
    [SET_POD_CHALLENGE_ROSTER],
    [TRANSITION_POD_CHALLENGE],
    [CONTROL_POD_CHALLENGE_CLOCK],
    [SET_POD_CHALLENGE_VOTING],
    [SET_POD_CHALLENGE_ROUND],
    [PUBLISH_POD_CHALLENGE_RESULT],
    [CONTROL_POD_CHALLENGE_QUIZ],
    [CONTROL_POD_CHALLENGE_BUZZER],
  ])('reports busy while a single control mutation is in flight (%#)', (doc) => {
    loading = new Set([doc]);
    expect(setup().current.busy).toBe(true);
  });

  it.each([[VOID_POD_CHALLENGE_SCORE], [SET_POD_CHALLENGE_ITEM]])('reports scoring while a void or an item save runs (%#)', (doc) => {
    loading = new Set([doc]);
    expect(setup().current.scoring).toBe(true);
  });

  it('is idle when nothing is running', () => {
    const result = setup();
    expect(result.current.busy).toBe(false);
    expect(result.current.scoring).toBe(false);
  });
});
