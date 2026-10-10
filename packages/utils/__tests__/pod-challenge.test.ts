import { describe, expect, it, vi } from 'vitest';
import {
  CHALLENGE_CHANGED_EVENT,
  CHALLENGE_POLL_MS,
  clockDisplayMs,
  clockElapsedMs,
  formatClock,
  hostPodChallengesPath,
  isChallengeFinished,
  isChallengeInPlay,
  mustSetUpChallenge,
  parseJsonObject,
  podChallengeLiveLink,
  podChallengeLivePath,
  watchChallenge,
  type ChallengeSocketLike,
} from '../src/pod-challenge';

describe('parseJsonObject', () => {
  it('reads a JSON object the server sent as a string', () => {
    expect(parseJsonObject('{"unit":"runs","increments":[1,2,4,6]}')).toEqual({ unit: 'runs', increments: [1, 2, 4, 6] });
  });

  it('reads anything that is not an object as empty rather than throwing', () => {
    expect(parseJsonObject(null)).toEqual({});
    expect(parseJsonObject(undefined)).toEqual({});
    expect(parseJsonObject('')).toEqual({});
    expect(parseJsonObject('{not json')).toEqual({});
    expect(parseJsonObject('[1,2]')).toEqual({});
    expect(parseJsonObject('"text"')).toEqual({});
    expect(parseJsonObject('null')).toEqual({});
  });
});

describe('challenge paths', () => {
  it('addresses the live arena by pod and challenge', () => {
    expect(podChallengeLivePath('pod1', 'ch9')).toBe('/pod/pod1/challenges/ch9/live');
    expect(podChallengeLiveLink('pod1', 'ch9', 'https://mweb.duncit.com')).toBe(
      'https://mweb.duncit.com/pod/pod1/challenges/ch9/live',
    );
  });

  it('addresses Host Studio’s challenge controls by pod', () => {
    expect(hostPodChallengesPath('pod1')).toBe('/host/pod/pod1/challenges');
  });
});

describe('challenge status groups', () => {
  it('treats live and paused as in play, and nothing else', () => {
    expect(['LIVE', 'PAUSED'].map(isChallengeInPlay)).toEqual([true, true]);
    expect(['DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].some(isChallengeInPlay)).toBe(false);
  });

  it('treats completed and archived as finished; a cancelled challenge has no result', () => {
    expect(['COMPLETED', 'ARCHIVED'].map(isChallengeFinished)).toEqual([true, true]);
    expect(['DRAFT', 'SCHEDULED', 'LIVE', 'PAUSED', 'CANCELLED'].some(isChallengeFinished)).toBe(false);
  });
});

describe('clockElapsedMs', () => {
  it('advances a running clock by the time since the answer arrived', () => {
    expect(clockElapsedMs({ clock_running: true, clock_elapsed_ms: 60_000 }, 1_000, 4_500)).toBe(63_500);
  });

  it('never runs backwards when the device clock steps back', () => {
    expect(clockElapsedMs({ clock_running: true, clock_elapsed_ms: 60_000 }, 5_000, 4_000)).toBe(60_000);
  });

  it('holds a stopped clock at the server’s figure', () => {
    expect(clockElapsedMs({ clock_running: false, clock_elapsed_ms: 60_000 }, 1_000, 999_999)).toBe(60_000);
  });
});

describe('clockDisplayMs', () => {
  it('shows elapsed time for a stopwatch', () => {
    expect(clockDisplayMs(95_000, 'STOPWATCH', 600)).toBe(95_000);
  });

  it('shows time remaining for a countdown, stopping at zero', () => {
    expect(clockDisplayMs(95_000, 'COUNTDOWN', 600)).toBe(505_000);
    expect(clockDisplayMs(700_000, 'COUNTDOWN', 600)).toBe(0);
  });
});

describe('formatClock', () => {
  it('formats minutes and seconds, adding hours only past an hour', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65_999)).toBe('01:05');
    expect(formatClock(3_600_000)).toBe('1:00:00');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });

  it('clamps a negative duration to zero', () => {
    expect(formatClock(-5_000)).toBe('00:00');
  });
});

/** A socket double that records emits and lets a test fire server events. */
function fakeSocket(connected: boolean) {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const emitted: unknown[][] = [];
  const socket: ChallengeSocketLike = {
    connected,
    on: (event, handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)?.add(handler);
    },
    off: (event, handler) => handlers.get(event)?.delete(handler),
    emit: (...args) => emitted.push(args),
  };
  const fire = (event: string, payload?: unknown) => handlers.get(event)?.forEach((h) => h(payload));
  const listeners = (event: string) => handlers.get(event)?.size ?? 0;
  return { socket, emitted, fire, listeners };
}

describe('watchChallenge', () => {
  it('joins the room and catches up on every connect, including a reconnect', () => {
    const { socket, emitted, fire } = fakeSocket(false);
    const onStale = vi.fn();
    watchChallenge(socket, 'ch9', () => 3, onStale);
    expect(emitted).toEqual([]);

    fire('connect');
    fire('connect');
    expect(emitted).toEqual([
      ['join_challenge', 'ch9'],
      ['join_challenge', 'ch9'],
    ]);
    expect(onStale).toHaveBeenCalledTimes(2);
  });

  it('joins straight away on a socket that is already connected', () => {
    const { socket, emitted } = fakeSocket(true);
    const onStale = vi.fn();
    watchChallenge(socket, 'ch9', () => 0, onStale);
    expect(emitted).toEqual([['join_challenge', 'ch9']]);
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('refetches only for a newer revision of this challenge', () => {
    const { socket, fire } = fakeSocket(false);
    const onStale = vi.fn();
    watchChallenge(socket, 'ch9', () => 5, onStale);

    fire(CHALLENGE_CHANGED_EVENT, { challengeId: 'ch9', revision: 6, kind: 'SCORE' });
    expect(onStale).toHaveBeenCalledTimes(1);

    fire(CHALLENGE_CHANGED_EVENT, { challengeId: 'ch9', revision: 5, kind: 'SCORE' });
    fire(CHALLENGE_CHANGED_EVENT, { challengeId: 'other', revision: 99, kind: 'SCORE' });
    fire(CHALLENGE_CHANGED_EVENT, { challengeId: 'ch9' });
    fire(CHALLENGE_CHANGED_EVENT, null);
    fire(CHALLENGE_CHANGED_EVENT, 'ch9');
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('leaves the room and stops listening when cleaned up', () => {
    const { socket, emitted, fire, listeners } = fakeSocket(false);
    const onStale = vi.fn();
    const stop = watchChallenge(socket, 'ch9', () => 0, onStale);
    stop();

    expect(emitted).toEqual([['leave_challenge', 'ch9']]);
    expect(listeners('connect')).toBe(0);
    expect(listeners(CHALLENGE_CHANGED_EVENT)).toBe(0);
    fire('connect');
    fire(CHALLENGE_CHANGED_EVENT, { challengeId: 'ch9', revision: 9, kind: 'SCORE' });
    expect(onStale).not.toHaveBeenCalled();
  });
});

describe('CHALLENGE_POLL_MS', () => {
  it('polls a socketless viewer every five seconds', () => {
    expect(CHALLENGE_POLL_MS).toBe(5000);
  });
});

describe('mustSetUpChallenge', () => {
  const required = { enabled: true, require_challenge: true, templates: [{ id: 't1' }] };

  it('sends the host to Challenges only when the category requires one and offers a template', () => {
    expect(mustSetUpChallenge(required)).toBe(true);
  });

  it('leaves challenges optional everywhere else', () => {
    expect(mustSetUpChallenge({ ...required, require_challenge: false })).toBe(false);
    expect(mustSetUpChallenge({ ...required, enabled: false })).toBe(false);
    expect(mustSetUpChallenge({ ...required, templates: [] })).toBe(false);
    expect(mustSetUpChallenge(null)).toBe(false);
    expect(mustSetUpChallenge(undefined)).toBe(false);
  });
});
