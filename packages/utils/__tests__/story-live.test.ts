import { describe, expect, it } from 'vitest';
import { isStoryLive } from '../src/story-live';

const NOW = new Date('2026-07-30T12:00:00.000Z').getTime();

describe('isStoryLive', () => {
  it('keeps a story until its expiry, then drops it', () => {
    expect(isStoryLive('2026-07-30T12:00:01.000Z', NOW)).toBe(true);
    expect(isStoryLive('2026-07-30T11:59:59.000Z', NOW)).toBe(false);
  });

  // Expiry means "no longer visible AT that instant" — the boundary is dead.
  it('treats the exact expiry instant as expired', () => {
    expect(isStoryLive('2026-07-30T12:00:00.000Z', NOW)).toBe(false);
  });

  it('treats a missing expiry as a permanent post, not a story', () => {
    expect(isStoryLive(null, NOW)).toBe(true);
    expect(isStoryLive(undefined, NOW)).toBe(true);
    expect(isStoryLive('', NOW)).toBe(true);
  });

  // An unparseable timestamp trusts the server filter instead of hiding content.
  it('keeps a story whose timestamp cannot be parsed', () => {
    expect(isStoryLive('not-a-date', NOW)).toBe(true);
  });

  it('defaults now to the real clock', () => {
    expect(isStoryLive('1999-01-01T00:00:00.000Z')).toBe(false);
    expect(isStoryLive('2999-01-01T00:00:00.000Z')).toBe(true);
  });
});
