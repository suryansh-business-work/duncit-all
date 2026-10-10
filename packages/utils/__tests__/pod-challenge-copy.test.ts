import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_ACTION_KEYS,
  CHALLENGE_CONFIRM_KEYS,
  CHALLENGE_STATUS_KEYS,
  CHALLENGE_TOGGLES,
} from '../src/pod-challenge-copy';

describe('challenge copy keys', () => {
  it('names a key for every lifecycle status the server can report', () => {
    expect(Object.keys(CHALLENGE_STATUS_KEYS).sort()).toEqual(
      ['ARCHIVED', 'CANCELLED', 'COMPLETED', 'DRAFT', 'LIVE', 'PAUSED', 'SCHEDULED'],
    );
  });

  it('names a key for every lifecycle action the server can allow', () => {
    expect(Object.keys(CHALLENGE_ACTION_KEYS).sort()).toEqual(
      ['ARCHIVE', 'CANCEL', 'COMPLETE', 'PAUSE', 'RESUME', 'SCHEDULE', 'START', 'UNSCHEDULE'],
    );
  });

  it('asks for confirmation only before the actions that end or freeze play', () => {
    expect(Object.keys(CHALLENGE_CONFIRM_KEYS).sort()).toEqual(['ARCHIVE', 'CANCEL', 'COMPLETE']);
  });

  it('lists the three independent switches first, then the notification switches', () => {
    expect(CHALLENGE_TOGGLES.map((x) => x.key)).toEqual([
      'enabled',
      'show_on_pod_details',
      'audience_interaction_enabled',
      'auto_whatsapp',
      'auto_email',
    ]);
  });

  it('keeps every key a literal in the mweb.challenge namespace', () => {
    const keys = [
      ...Object.values(CHALLENGE_STATUS_KEYS),
      ...Object.values(CHALLENGE_ACTION_KEYS),
      ...Object.values(CHALLENGE_CONFIRM_KEYS).flatMap((c) => [c.title, c.body]),
      ...CHALLENGE_TOGGLES.map((x) => x.label),
    ];
    expect(keys.filter((key) => !key.startsWith('mweb.challenge.'))).toEqual([]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
