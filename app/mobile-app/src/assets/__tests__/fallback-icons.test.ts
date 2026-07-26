import { FALLBACK_ICON_NAMES } from '@duncit/fallback-icons';

import { FALLBACK_ICONS } from '@/assets/fallback-icons';

describe('FALLBACK_ICONS (native bundle)', () => {
  it('ships every name in the shared contract', () => {
    const missing = FALLBACK_ICON_NAMES.filter((name) => !FALLBACK_ICONS[name]);
    expect(missing).toEqual([]);
  });

  it('resolves every entry to a real bundled asset', () => {
    // A require of a missing file is already a Metro bundling error; this
    // guards an entry that resolves to undefined.
    const unresolved = Object.entries(FALLBACK_ICONS)
      .filter(([, source]) => !source)
      .map(([name]) => name);
    expect(unresolved).toEqual([]);
  });
});
