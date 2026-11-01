import { describe, expect, it } from 'vitest';
import { createSessionClock } from '../../src/analytics/session';
import { SESSION_TIMEOUT_MS } from '../../src/analytics/taxonomy';

const ids = () => {
  let n = 0;
  return () => `s${++n}`;
};

describe('createSessionClock', () => {
  it('starts a session on the first activity and keeps it while activity continues', () => {
    const clock = createSessionClock({ newId: ids() });
    expect(clock.touch(1_000)).toEqual({ id: 's1', started: true });
    expect(clock.touch(1_000 + SESSION_TIMEOUT_MS)).toEqual({ id: 's1', started: false });
  });

  it('starts a new session after 30 minutes without activity — measured from the last activity, not the first', () => {
    const clock = createSessionClock({ newId: ids() });
    clock.touch(0);
    clock.touch(20 * 60_000);
    expect(clock.touch(45 * 60_000)).toEqual({ id: 's1', started: false });
    expect(clock.touch(45 * 60_000 + SESSION_TIMEOUT_MS + 1)).toEqual({ id: 's2', started: true });
  });

  it('does not move the session back when an event arrives with an earlier time', () => {
    const clock = createSessionClock({ newId: ids(), timeoutMs: 100 });
    clock.touch(1_000);
    clock.touch(900);
    expect(clock.touch(1_100)).toEqual({ id: 's1', started: false });
    expect(clock.touch(1_201)).toEqual({ id: 's2', started: true });
  });

  it('mints ids itself when none is given', () => {
    const first = createSessionClock().touch(0);
    expect(first.started).toBe(true);
    expect(first.id.length).toBeGreaterThan(10);
  });
});
