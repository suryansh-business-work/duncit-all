import { OCCASION_ICONS, bundledOccasionIcon } from '@/assets/occasion-icons';

describe('bundledOccasionIcon', () => {
  it('returns the bundled asset for a shipped slug', () => {
    expect(bundledOccasionIcon('diwali')).toBe(OCCASION_ICONS.diwali);
    expect(bundledOccasionIcon('new-year')).toBe(OCCASION_ICONS['new-year']);
  });

  it('returns null for a slug the app ships no art for, or no slug at all', () => {
    expect(bundledOccasionIcon('not-shipped')).toBeNull();
    expect(bundledOccasionIcon('')).toBeNull();
    expect(bundledOccasionIcon(null)).toBeNull();
    expect(bundledOccasionIcon(undefined)).toBeNull();
  });

  it('ships art for every slug in the map, so no entry can resolve to nothing', () => {
    // A missing file would already fail the Metro bundle; this guards a typo
    // that maps a slug to an undefined export.
    const unresolved = Object.entries(OCCASION_ICONS)
      .filter(([, source]) => !source)
      .map(([slug]) => slug);
    expect(unresolved).toEqual([]);
  });
});
