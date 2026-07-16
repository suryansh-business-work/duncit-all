import { describe, expect, it } from 'vitest';
import { interleaveAds, isAdEntry, type AdEntry } from '../../AdSlot';
import type { PublicAd } from '../../useActiveAds';

const ad = (id: string): PublicAd => ({
  id,
  ad_type: 'IMAGE',
  media_url: `https://cdn.example/${id}.jpg`,
  redirect_url: null,
  ad_title: null,
  position: 'POD_LIST',
});

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `item-${i + 1}` }));

describe('interleaveAds', () => {
  it('returns the original list untouched when there are no ads', () => {
    const list = items(6);
    expect(interleaveAds(list, [], 4)).toEqual(list);
  });

  it('weaves one ad after every N items', () => {
    const out = interleaveAds(items(9), [ad('a1'), ad('a2')], 4);
    expect(out).toHaveLength(11);
    expect(out[4]).toEqual({ __ad: ad('a1') });
    expect(out[9]).toEqual({ __ad: ad('a2') });
    expect(isAdEntry(out[10])).toBe(false);
  });

  it('never repeats an ad (keys stay unique) once inventory runs out', () => {
    const out = interleaveAds(items(12), [ad('only')], 4);
    const adEntries = out.filter((entry): entry is AdEntry => isAdEntry(entry));
    expect(adEntries).toHaveLength(1);
    expect(adEntries[0].__ad.id).toBe('only');
  });

  it('does not insert anything when the list is shorter than the interval', () => {
    expect(interleaveAds(items(3), [ad('a1')], 4)).toEqual(items(3));
  });

  it('isAdEntry narrows ad entries from plain items', () => {
    const out = interleaveAds(items(4), [ad('a1')], 4);
    const flags = out.map((entry) => isAdEntry(entry));
    expect(flags).toEqual([false, false, false, false, true]);
  });
});
