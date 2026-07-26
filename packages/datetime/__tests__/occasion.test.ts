import { describe, expect, it } from 'vitest';
import { resolveActiveOccasion } from '../src/occasion';

const at = (s: string) => new Date(s).getTime();

const diwali = {
  slug: 'diwali',
  starts_at: '2026-11-05T00:00:00.000Z',
  ends_at: '2026-11-12T23:59:59.000Z',
  sort_order: 0,
};
const newYear = {
  slug: 'new-year',
  starts_at: '2026-12-28T00:00:00.000Z',
  ends_at: '2027-01-02T23:59:59.000Z',
  sort_order: 0,
};

describe('resolveActiveOccasion', () => {
  it('returns the window covering now, inclusive of both edges', () => {
    const list = [diwali, newYear];
    expect(resolveActiveOccasion(list, at('2026-11-07T12:00:00.000Z'))?.slug).toBe('diwali');
    expect(resolveActiveOccasion(list, at('2026-11-05T00:00:00.000Z'))?.slug).toBe('diwali');
    expect(resolveActiveOccasion(list, at('2026-11-12T23:59:59.000Z'))?.slug).toBe('diwali');
    expect(resolveActiveOccasion(list, at('2026-12-30T00:00:00.000Z'))?.slug).toBe('new-year');
  });

  it('returns null when nothing is active, or the list is empty/absent', () => {
    expect(resolveActiveOccasion([diwali], at('2026-06-01T00:00:00.000Z'))).toBeNull();
    expect(resolveActiveOccasion([], at('2026-11-07T00:00:00.000Z'))).toBeNull();
    expect(resolveActiveOccasion(null, at('2026-11-07T00:00:00.000Z'))).toBeNull();
    expect(resolveActiveOccasion(undefined, at('2026-11-07T00:00:00.000Z'))).toBeNull();
  });

  it('skips deactivated windows and windows with unusable dates', () => {
    const now = at('2026-11-07T00:00:00.000Z');
    expect(resolveActiveOccasion([{ ...diwali, is_active: false }], now)).toBeNull();
    expect(resolveActiveOccasion([{ ...diwali, starts_at: null }], now)).toBeNull();
    expect(resolveActiveOccasion([{ ...diwali, ends_at: 'junk' }], now)).toBeNull();
    // is_active omitted or true both count as active.
    expect(resolveActiveOccasion([diwali], now)?.slug).toBe('diwali');
    expect(resolveActiveOccasion([{ ...diwali, is_active: true }], now)?.slug).toBe('diwali');
  });

  it('lets a higher sort_order layer a campaign over a longer season', () => {
    const season = { slug: 'season', starts_at: '2026-11-01T00:00:00.000Z', ends_at: '2026-11-30T00:00:00.000Z', sort_order: 0 };
    const campaign = { slug: 'campaign', starts_at: '2026-11-06T00:00:00.000Z', ends_at: '2026-11-08T00:00:00.000Z', sort_order: 5 };
    const now = at('2026-11-07T00:00:00.000Z');
    expect(resolveActiveOccasion([season, campaign], now)?.slug).toBe('campaign');
    expect(resolveActiveOccasion([campaign, season], now)?.slug).toBe('campaign');
  });

  it('breaks a sort_order tie on the later start', () => {
    const early = { slug: 'early', starts_at: '2026-11-01T00:00:00.000Z', ends_at: '2026-11-30T00:00:00.000Z' };
    const later = { slug: 'later', starts_at: '2026-11-06T00:00:00.000Z', ends_at: '2026-11-30T00:00:00.000Z' };
    expect(resolveActiveOccasion([early, later], at('2026-11-07T00:00:00.000Z'))?.slug).toBe('later');
  });
});
