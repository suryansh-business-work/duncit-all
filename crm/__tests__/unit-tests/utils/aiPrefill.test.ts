import { describe, expect, it } from 'vitest';
import { mergeAiPrefill } from '@/forms/aiPrefill';

describe('mergeAiPrefill', () => {
  const initial = { venue_name: '', city: '', capacity_max: '', extras: { stage: false } };

  it('returns the initial values when prefill is missing', () => {
    expect(mergeAiPrefill(initial, undefined)).toBe(initial);
    expect(mergeAiPrefill(initial, null)).toBe(initial);
  });

  it('copies only keys that exist on the target', () => {
    const out = mergeAiPrefill(initial, { venue_name: 'New', some_extra: 'ignored' } as any);
    expect(out.venue_name).toBe('New');
    expect((out as any).some_extra).toBeUndefined();
  });

  it('skips undefined/null source values so existing defaults survive', () => {
    const out = mergeAiPrefill({ ...initial, venue_name: 'Existing' }, { venue_name: null } as any);
    expect(out.venue_name).toBe('Existing');
  });

  it('replaces arrays / primitives wholesale', () => {
    const merged = mergeAiPrefill(
      { ...initial, capacity_max: '50' },
      { capacity_max: '200' }
    );
    expect(merged.capacity_max).toBe('200');
  });
});
