import { describe, expect, it } from 'vitest';
import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_EARN_KEY,
  LEADERBOARD_PERIODS,
  LEADERBOARD_PERIOD_KEY,
  LEADERBOARD_POINTS_FIELD,
  LEADERBOARD_TAB_KEY,
  leaderboardMedal,
  type LeaderboardCategory,
  type LeaderboardMedal,
} from '../src/leaderboard';

/** The namespace every leaderboard key lives under in the shared mWeb bundle. */
const NAMESPACE = 'mweb.leaderboard.';

/** Reads one key map for every board, in tab order. */
const keysFor = (map: Record<LeaderboardCategory, string>): string[] =>
  LEADERBOARD_CATEGORIES.map((category) => map[category]);

describe('LEADERBOARD_CATEGORIES', () => {
  // Both surfaces render the tab strip from this tuple, so the order IS the
  // product: members first, then the three earning roles, then brands.
  it('lists the five boards in the order the tab strip renders them', () => {
    expect(LEADERBOARD_CATEGORIES).toEqual(['USER', 'HOST', 'CLUB_ADMIN', 'VENUE', 'BRAND']);
  });

  // The tab strip, the earn card and the price lookup all iterate this tuple
  // blind and index a map with it: a board in the tuple with no map entry
  // renders `t(undefined)`, and a map entry for a board outside the tuple is
  // copy nobody can ever open. So the tuple and every board-keyed map must
  // name exactly the same boards — no more, no fewer.
  it('is the one board list every board-keyed map is written for', () => {
    const boards = [...LEADERBOARD_CATEGORIES].toSorted((a, b) => a.localeCompare(b));
    for (const map of [LEADERBOARD_TAB_KEY, LEADERBOARD_EARN_KEY, LEADERBOARD_POINTS_FIELD]) {
      expect(Object.keys(map).toSorted((a, b) => a.localeCompare(b))).toEqual(boards);
    }
  });
});

describe('LEADERBOARD_PERIODS', () => {
  it('offers the ranking windows narrowest first, ending with all time', () => {
    expect(LEADERBOARD_PERIODS).toEqual(['MONTH', 'YEAR', 'ALL']);
  });
});

describe('LEADERBOARD_TAB_KEY', () => {
  // The key names are the contract with the Localization entries: a key that
  // drifts from the bundle renders the tab blank on both surfaces, so the
  // exact spelling is asserted, not just the shape.
  it('names the tab label entry for each board', () => {
    expect(LEADERBOARD_TAB_KEY).toEqual({
      USER: 'mweb.leaderboard.tabUser',
      HOST: 'mweb.leaderboard.tabHost',
      CLUB_ADMIN: 'mweb.leaderboard.tabClubAdmin',
      VENUE: 'mweb.leaderboard.tabVenue',
      BRAND: 'mweb.leaderboard.tabBrand',
    });
  });

  it('gives every board a distinct label, so no two tabs read the same', () => {
    const keys = keysFor(LEADERBOARD_TAB_KEY);
    expect(new Set(keys).size).toBe(LEADERBOARD_CATEGORIES.length);
  });
});

describe('LEADERBOARD_EARN_KEY', () => {
  it('names the "how to increase your points" line for each board', () => {
    expect(LEADERBOARD_EARN_KEY).toEqual({
      USER: 'mweb.leaderboard.earnJoin',
      HOST: 'mweb.leaderboard.earnHost',
      CLUB_ADMIN: 'mweb.leaderboard.earnClubAdmin',
      VENUE: 'mweb.leaderboard.earnVenue',
      BRAND: 'mweb.leaderboard.earnBrand',
    });
  });

  // An earn line explains an ACTION ("join a pod"), a tab names a BOARD
  // ("Users"); reusing one string for both would read wrong in one place.
  // Asserted as "ten distinct keys across the two maps" so an empty or
  // collapsed earn map fails here instead of trivially never overlapping.
  it('never reuses a tab label as an earn line', () => {
    const tabs = keysFor(LEADERBOARD_TAB_KEY);
    const earns = keysFor(LEADERBOARD_EARN_KEY);
    for (const key of earns) expect(tabs.includes(key), key).toBe(false);
    expect(new Set([...tabs, ...earns]).size).toBe(2 * LEADERBOARD_CATEGORIES.length);
  });

  it('gives every board its own earn line', () => {
    const keys = keysFor(LEADERBOARD_EARN_KEY);
    expect(new Set(keys).size).toBe(LEADERBOARD_CATEGORIES.length);
  });
});

describe('LEADERBOARD_PERIOD_KEY', () => {
  it('names the toggle label for each ranking window', () => {
    expect(LEADERBOARD_PERIOD_KEY).toEqual({
      MONTH: 'mweb.leaderboard.periodMonth',
      YEAR: 'mweb.leaderboard.periodYear',
      ALL: 'mweb.leaderboard.periodAll',
    });
  });

  it('gives every window a distinct label', () => {
    const keys = LEADERBOARD_PERIODS.map((period) => LEADERBOARD_PERIOD_KEY[period]);
    expect(new Set(keys).size).toBe(LEADERBOARD_PERIODS.length);
  });
});

describe('every leaderboard i18n key', () => {
  // mWeb and native share MWEB_BUNDLE; a key outside this namespace would
  // resolve on neither surface, and the key gate only sees namespaced literals.
  it('lives under the shared mweb.leaderboard namespace', () => {
    const all = [
      ...keysFor(LEADERBOARD_TAB_KEY),
      ...keysFor(LEADERBOARD_EARN_KEY),
      ...LEADERBOARD_PERIODS.map((period) => LEADERBOARD_PERIOD_KEY[period]),
    ];
    for (const key of all) {
      expect(key.startsWith(NAMESPACE), key).toBe(true);
      expect(key.length, key).toBeGreaterThan(NAMESPACE.length);
    }
  });
});

describe('LEADERBOARD_POINTS_FIELD', () => {
  // These are `leaderboardConfig` field names read straight off the API
  // payload. The "How to earn" card drops any board whose field reads back
  // undefined (`?? 0` → switched off), so a misspelt field hides a board
  // silently rather than failing loudly — hence exact values.
  it('prices each board by the leaderboardConfig field for its action', () => {
    expect(LEADERBOARD_POINTS_FIELD).toEqual({
      USER: 'points_per_join',
      HOST: 'points_per_host',
      CLUB_ADMIN: 'points_per_club_pod',
      VENUE: 'points_per_venue_pod',
      BRAND: 'points_per_product_sale',
    });
  });

  it('never prices two boards from the same number', () => {
    const fields = keysFor(LEADERBOARD_POINTS_FIELD);
    expect(new Set(fields).size).toBe(LEADERBOARD_CATEGORIES.length);
  });
});

describe('leaderboardMedal', () => {
  it('tints the top three ranks gold, silver and bronze in that order', () => {
    expect(leaderboardMedal(1)).toBe('gold');
    expect(leaderboardMedal(2)).toBe('silver');
    expect(leaderboardMedal(3)).toBe('bronze');
  });

  it('leaves everyone past the podium untinted', () => {
    expect(leaderboardMedal(4)).toBeNull();
    expect(leaderboardMedal(10)).toBeNull();
    expect(leaderboardMedal(1000)).toBeNull();
  });

  // Rank 0 / negative is "not ranked yet" on the API; NaN is a missing rank.
  // None of them may ever light up a medal.
  it('gives no medal to an unranked or nonsensical rank', () => {
    expect(leaderboardMedal(0)).toBeNull();
    expect(leaderboardMedal(-1)).toBeNull();
    expect(leaderboardMedal(Number.NaN)).toBeNull();
  });

  it('only honours exact whole podium ranks', () => {
    expect(leaderboardMedal(1.5)).toBeNull();
    expect(leaderboardMedal(2.0)).toBe('silver');
  });

  // Both list views split rows into "podium" and "rest" with exactly this
  // null check, so the medal function is what decides the podium's size.
  it('puts exactly the first three of a ranked list on the podium', () => {
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const podium = ranks.filter((rank) => leaderboardMedal(rank) !== null);
    const rest = ranks.filter((rank) => leaderboardMedal(rank) === null);
    expect(podium).toEqual([1, 2, 3]);
    expect(rest).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it('uses a different medal for each podium step', () => {
    const medals = [1, 2, 3].map((rank) => leaderboardMedal(rank)) as LeaderboardMedal[];
    expect(new Set(medals).size).toBe(3);
  });
});
