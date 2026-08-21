import { describe, expect, it } from 'vitest';
import {
  APP_POPUP_DEFAULT_ASPECT,
  APP_POPUP_DISMISSED_KEY,
  APP_POPUP_DISMISSED_MAX,
  APP_POPUP_HEIGHT_FRACTION,
  APP_POPUP_MAX_WIDTH,
  APP_POPUP_VIEWPORT_GUTTER,
  appPopupAspect,
  appPopupImageSize,
  appPopupLimits,
  detectClientPlatform,
  isPopupDismissed,
  parseDismissedPopupIds,
  readDismissedPopupIds,
  rememberDismissedPopup,
  withDismissedPopupId,
  type AppPopupSize,
  type AppPopupStorage,
} from '../src/app-popup';

/** An in-memory `localStorage` stand-in: synchronous, like the browser's. */
const syncStore = (seed: Record<string, string> = {}) => {
  const data = new Map(Object.entries(seed));
  const storage: AppPopupStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
  return { storage, data };
};

/** An `expo-secure-store` stand-in: every call answers through a promise. */
const asyncStore = (seed: Record<string, string> = {}) => {
  const data = new Map(Object.entries(seed));
  const storage: AppPopupStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
  };
  return { storage, data };
};

/** A campaign id list of the given length, oldest first. */
const campaignIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `camp-${i}`);

const size = (width: number, height: number): AppPopupSize => ({ width, height });

/** A 360×800 phone: the card is the viewport minus a gutter each side. */
const PHONE_LIMITS = appPopupLimits(size(360, 800));

describe('APP_POPUP_DISMISSED_KEY', () => {
  // The key is load-bearing: mWeb and the native web build share one origin's
  // localStorage, so a rename would orphan every dismissal already written.
  it('is the single key both browsers and the phone write under', () => {
    expect(APP_POPUP_DISMISSED_KEY).toBe('duncit_app_popup_dismissed');
  });
});

describe('parseDismissedPopupIds', () => {
  it('reads back the list of ids the writer stored', () => {
    expect(parseDismissedPopupIds('["camp-a","camp-b"]')).toEqual(['camp-a', 'camp-b']);
  });

  it('treats an empty, null or undefined value as nothing dismissed', () => {
    expect(parseDismissedPopupIds('')).toEqual([]);
    expect(parseDismissedPopupIds(null)).toEqual([]);
    expect(parseDismissedPopupIds(undefined)).toEqual([]);
  });

  it('treats corrupt JSON as nothing dismissed rather than throwing on app open', () => {
    expect(parseDismissedPopupIds('not json')).toEqual([]);
    expect(parseDismissedPopupIds('["camp-a"')).toEqual([]);
  });

  // A single "seen" flag is exactly the shape this module refuses to store —
  // it would swallow every campaign after the first — so it reads as nothing.
  it('ignores any stored value that is not a list', () => {
    expect(parseDismissedPopupIds('"camp-a"')).toEqual([]);
    expect(parseDismissedPopupIds('true')).toEqual([]);
    expect(parseDismissedPopupIds('{"id":"camp-a"}')).toEqual([]);
  });

  it('keeps the valid ids and drops non-string or empty entries from a hand-edited list', () => {
    expect(parseDismissedPopupIds('["camp-a", 1, null, "", "camp-b", {}]')).toEqual([
      'camp-a',
      'camp-b',
    ]);
  });
});

describe('withDismissedPopupId', () => {
  it('appends a newly closed id after the ones already closed', () => {
    expect(withDismissedPopupId(['camp-a'], 'camp-b')).toEqual(['camp-a', 'camp-b']);
  });

  it('does not mutate the list it was given', () => {
    const ids = ['camp-a'];
    withDismissedPopupId(ids, 'camp-b');
    expect(ids).toEqual(['camp-a']);
  });

  it('hands the same list back when the id is already in it', () => {
    const ids = ['camp-a', 'camp-b'];
    expect(withDismissedPopupId(ids, 'camp-a')).toBe(ids);
  });

  it('hands the same list back for an empty id', () => {
    const ids = ['camp-a'];
    expect(withDismissedPopupId(ids, '')).toBe(ids);
  });

  it('keeps at most APP_POPUP_DISMISSED_MAX ids, dropping the oldest first', () => {
    const full = campaignIds(APP_POPUP_DISMISSED_MAX);
    const next = withDismissedPopupId(full, 'camp-new');
    // Exactly the head is gone; every other id keeps its place and order.
    expect(next).toEqual([...full.slice(1), 'camp-new']);
    expect(next).toHaveLength(APP_POPUP_DISMISSED_MAX);
  });

  // The cap is "at most", not "fewer than": filling the last free slot must
  // not already evict the oldest campaign.
  it('keeps every id when the list reaches the cap exactly', () => {
    const oneShort = campaignIds(APP_POPUP_DISMISSED_MAX - 1);
    expect(withDismissedPopupId(oneShort, 'camp-new')).toEqual([...oneShort, 'camp-new']);
  });

  // Closing the same popup twice must never evict a different campaign: the
  // oldest id stays where it is instead of being re-appended and pushing the
  // head of a full list out.
  it('leaves a full list untouched when re-closing the oldest popup in it', () => {
    const full = campaignIds(APP_POPUP_DISMISSED_MAX);
    expect(withDismissedPopupId(full, 'camp-0')).toBe(full);
  });
});

describe('isPopupDismissed', () => {
  it('is true when this device has already closed the popup', () => {
    expect(isPopupDismissed(['camp-a', 'camp-b'], 'camp-b')).toBe(true);
  });

  it('is false for a campaign this device has never closed', () => {
    expect(isPopupDismissed(['camp-a'], 'camp-b')).toBe(false);
    expect(isPopupDismissed([], 'camp-b')).toBe(false);
  });

  // No id means no popup, so nothing can have been dismissed — even if a
  // hand-edited list holds an empty entry that a plain lookup would match.
  it('is false when there is no popup id to check', () => {
    expect(isPopupDismissed(['camp-a'], null)).toBe(false);
    expect(isPopupDismissed(['camp-a'], undefined)).toBe(false);
    expect(isPopupDismissed([''], '')).toBe(false);
  });
});

describe('readDismissedPopupIds', () => {
  it('reads the list under the shared key from a synchronous store', async () => {
    const { storage } = syncStore({ [APP_POPUP_DISMISSED_KEY]: '["camp-a","camp-b"]' });
    await expect(readDismissedPopupIds(storage)).resolves.toEqual(['camp-a', 'camp-b']);
  });

  it('reads the list from a store that answers through a promise', async () => {
    const { storage } = asyncStore({ [APP_POPUP_DISMISSED_KEY]: '["camp-a"]' });
    await expect(readDismissedPopupIds(storage)).resolves.toEqual(['camp-a']);
  });

  it('answers an empty list when nothing has been stored yet', async () => {
    await expect(readDismissedPopupIds(syncStore().storage)).resolves.toEqual([]);
  });

  it('answers an empty list when the store throws, as private browsing does', async () => {
    const storage: AppPopupStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
    };
    await expect(readDismissedPopupIds(storage)).resolves.toEqual([]);
  });

  it('answers an empty list when a locked keystore rejects the read', async () => {
    const storage: AppPopupStorage = {
      getItem: () => Promise.reject(new Error('keystore locked')),
      setItem: () => undefined,
    };
    await expect(readDismissedPopupIds(storage)).resolves.toEqual([]);
  });
});

describe('rememberDismissedPopup', () => {
  it('stores the closed id as a JSON list under the shared key and answers that list', async () => {
    const { storage, data } = syncStore();
    await expect(rememberDismissedPopup(storage, 'camp-a')).resolves.toEqual(['camp-a']);
    expect(data.get(APP_POPUP_DISMISSED_KEY)).toBe('["camp-a"]');
  });

  it('appends to the ids already stored instead of replacing them', async () => {
    const { storage, data } = asyncStore({ [APP_POPUP_DISMISSED_KEY]: '["camp-a"]' });
    await expect(rememberDismissedPopup(storage, 'camp-b')).resolves.toEqual(['camp-a', 'camp-b']);
    expect(data.get(APP_POPUP_DISMISSED_KEY)).toBe('["camp-a","camp-b"]');
  });

  it('does not duplicate the id when the same popup is closed a second time', async () => {
    const { storage, data } = syncStore({ [APP_POPUP_DISMISSED_KEY]: '["camp-a","camp-b"]' });
    await expect(rememberDismissedPopup(storage, 'camp-a')).resolves.toEqual(['camp-a', 'camp-b']);
    expect(data.get(APP_POPUP_DISMISSED_KEY)).toBe('["camp-a","camp-b"]');
  });

  // The server dismissal is still on its way; a device that cannot persist
  // simply offers the popup once more, and the caller still gets the list.
  it('still answers the new list when the store refuses the write', async () => {
    const throwing: AppPopupStorage = {
      getItem: () => '["camp-a"]',
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    await expect(rememberDismissedPopup(throwing, 'camp-b')).resolves.toEqual(['camp-a', 'camp-b']);

    const rejecting: AppPopupStorage = {
      getItem: () => '["camp-a"]',
      setItem: () => Promise.reject(new Error('keystore locked')),
    };
    await expect(rememberDismissedPopup(rejecting, 'camp-b')).resolves.toEqual(['camp-a', 'camp-b']);
  });

  it('starts a fresh list when the read fails but the write works', async () => {
    const written = new Map<string, string>();
    const storage: AppPopupStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: (key, value) => {
        written.set(key, value);
      },
    };
    await expect(rememberDismissedPopup(storage, 'camp-a')).resolves.toEqual(['camp-a']);
    expect(written.get(APP_POPUP_DISMISSED_KEY)).toBe('["camp-a"]');
  });
});

describe('appPopupAspect', () => {
  // Ratios chosen away from the 0.8 default, so a fallback masquerading as the
  // decoded size cannot pass.
  it("is the picture's own width-to-height ratio once it has decoded", () => {
    expect(appPopupAspect(size(600, 1000))).toBe(0.6);
    expect(appPopupAspect(size(1000, 500))).toBe(2);
  });

  // Opening at the portrait default and staying there keeps the overlay from
  // jumping to a new size the moment the image decodes.
  it('assumes the 4:5 portrait default before the picture has decoded', () => {
    expect(APP_POPUP_DEFAULT_ASPECT).toBe(0.8);
    expect(appPopupAspect(null)).toBe(APP_POPUP_DEFAULT_ASPECT);
    expect(appPopupAspect(undefined)).toBe(APP_POPUP_DEFAULT_ASPECT);
  });

  it('falls back to the default for a size with no width or no height', () => {
    expect(appPopupAspect(size(0, 1000))).toBe(APP_POPUP_DEFAULT_ASPECT);
    expect(appPopupAspect(size(800, 0))).toBe(APP_POPUP_DEFAULT_ASPECT);
    expect(appPopupAspect(size(-1, 1000))).toBe(APP_POPUP_DEFAULT_ASPECT);
    expect(appPopupAspect(size(800, -1))).toBe(APP_POPUP_DEFAULT_ASPECT);
  });
});

describe('appPopupLimits', () => {
  it('leaves a gutter each side of the card on a phone so the backdrop stays tappable', () => {
    expect(PHONE_LIMITS.width).toBe(360 - APP_POPUP_VIEWPORT_GUTTER * 2);
    expect(PHONE_LIMITS.width).toBe(312);
  });

  it('never lets the card grow past the max width on a desktop browser', () => {
    expect(appPopupLimits(size(1440, 900)).width).toBe(APP_POPUP_MAX_WIDTH);
    expect(APP_POPUP_MAX_WIDTH).toBe(420);
  });

  it('gives the image only its fraction of the viewport height, leaving room for the CTA', () => {
    expect(PHONE_LIMITS.height).toBe(800 * APP_POPUP_HEIGHT_FRACTION);
    expect(PHONE_LIMITS.height).toBe(496);
    expect(appPopupLimits(size(1440, 900)).height).toBe(558);
  });
});

describe('appPopupImageSize', () => {
  // The rule: the box touches ONE limit exactly and stays inside the other, so
  // there is neither dead space beside the image nor anything cropped away.
  it('fills the width for portrait art on a phone and keeps the height inside the limit', () => {
    const box = appPopupImageSize(size(800, 1000), PHONE_LIMITS);
    expect(box).toEqual({ width: 312, height: 390 });
    expect(box.width).toBe(PHONE_LIMITS.width);
    expect(box.height).toBeLessThan(PHONE_LIMITS.height);
  });

  it('fills the height for tall art and narrows the width to keep its aspect', () => {
    const box = appPopupImageSize(size(500, 1000), PHONE_LIMITS);
    expect(box).toEqual({ width: 248, height: 496 });
    expect(box.height).toBe(PHONE_LIMITS.height);
    expect(box.width).toBeLessThan(PHONE_LIMITS.width);
  });

  it('fills the width for wide art on a desktop and shrinks the height to match', () => {
    expect(appPopupImageSize(size(2000, 1000), appPopupLimits(size(1440, 900)))).toEqual({
      width: 420,
      height: 210,
    });
  });

  // 312 wide at 4:5 is 390 tall — the same box a decoded 800×1000 gets, so the
  // card does not jump when the real picture arrives.
  it('draws the portrait default box before the picture has decoded', () => {
    expect(appPopupImageSize(null, PHONE_LIMITS)).toEqual({ width: 312, height: 390 });
    expect(appPopupImageSize(undefined, PHONE_LIMITS)).toEqual({ width: 312, height: 390 });
  });

  it('rounds to whole pixels so neither surface draws a blurry half-pixel edge', () => {
    expect(appPopupImageSize(size(1, 3), size(100, 100))).toEqual({ width: 33, height: 100 });
  });

  it('never collapses to a zero-sized box when the limits are degenerate', () => {
    expect(appPopupImageSize(null, size(0, 0))).toEqual({ width: 1, height: 1 });
  });
});

describe('detectClientPlatform', () => {
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const IPAD =
    'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
  const IPOD =
    'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
  const ANDROID =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  const WINDOWS =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const MAC =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

  // A phone in a browser stands in for its store build, so a campaign aimed at
  // iOS reaches iPhone users on mWeb too (rule 27).
  it('reports an iPhone, iPad or iPod browser as the iOS build', () => {
    expect(detectClientPlatform(IPHONE)).toBe('IOS');
    expect(detectClientPlatform(IPAD)).toBe('IOS');
    expect(detectClientPlatform(IPOD)).toBe('IOS');
  });

  it('reports an Android browser as the Android build', () => {
    expect(detectClientPlatform(ANDROID)).toBe('ANDROID');
  });

  it('matches the OS token regardless of letter case', () => {
    expect(detectClientPlatform('iphone')).toBe('IOS');
    expect(detectClientPlatform('ANDROID 12')).toBe('ANDROID');
  });

  // A desktop is neither store build, so it only ever gets the popups aimed at
  // everyone — and an unknown client is treated the same way.
  it('reports a desktop browser, or an unknown client, as WEB', () => {
    expect(detectClientPlatform(WINDOWS)).toBe('WEB');
    expect(detectClientPlatform(MAC)).toBe('WEB');
    expect(detectClientPlatform('')).toBe('WEB');
  });
});
