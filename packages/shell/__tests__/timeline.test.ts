/**
 * Messages and calls merged by time, and how a call's length reads.
 */
import { describe, expect, it } from 'vitest';

import { buildTimeline, callDuration } from '../src/staff-chat/timeline';
import type { StaffCall, StaffMessage } from '../src/staff-chat/queries';

const MESSAGE: StaffMessage = { id: 'm-1', from_user_id: 'u-1', to_user_id: 'u-2', text: 'hi' } as StaffMessage;
const CALL: StaffCall = {
  id: 'c-1',
  from_user_id: 'u-1',
  to_user_id: 'u-2',
  kind: 'AUDIO',
  outcome: 'ANSWERED',
  duration_seconds: 60,
} as StaffCall;

describe('buildTimeline', () => {
  it('keeps a call that happened after the loaded messages began', () => {
    const message = { ...MESSAGE, created_at: '2026-08-20T10:00:00.000Z' };
    const call = { ...CALL, started_at: '2026-08-20T11:00:00.000Z' };

    const timeline = buildTimeline([message], [call]);

    expect(timeline.map((entry) => entry.kind)).toEqual(['MESSAGE', 'CALL']);
  });

  it('drops a call older than the loaded page, rather than stacking it at the top', () => {
    const message = { ...MESSAGE, created_at: '2026-08-20T10:00:00.000Z' };
    const call = { ...CALL, started_at: '2026-08-19T09:00:00.000Z' };

    const timeline = buildTimeline([message], [call]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].kind).toBe('MESSAGE');
  });
});

describe('callDuration', () => {
  it('shows plain seconds under a minute', () => {
    expect(callDuration(45)).toBe('45s');
  });

  it('shows minutes and seconds once a call runs a minute or more', () => {
    expect(callDuration(64)).toBe('1m 04s');
  });
});
