import { describe, expect, it } from 'vitest';
import type { AutoPodRole } from '../src/auto-pod';
import {
  mwebAutoPodLabels,
  shellAutoPodLabels,
  mwebPodKindLabels,
  shellPodKindLabels,
  venueCategoryLabels,
  venueCategoryLevelIds,
  venueCategoryList,
  venueCategoryPaths,
  venueHostsSubCategory,
  type AutoPodLabels,
  type AutoPodTranslate,
  type VenueCategoryEntry,
} from '../src/auto-pod-copy';

/** Every partner an enrolment can belong to — the three ticks on a card. */
const ROLES: AutoPodRole[] = ['venue', 'host', 'club'];

/**
 * Every key either namespace renders — the `autoPods` block of both
 * `@duncit/i18n` bundles (`mweb.autoPods.*` and `shell.autoPods.*`), in bundle
 * order. A builder asking for a key that is not here ships a key with no copy
 * behind it (the admin seeds exactly these rows via "Import app keys"); a row
 * here the builder never asks for is copy nobody renders.
 */
const BUNDLE_KEYS = [
  'venueTitle', 'hostTitle', 'clubTitle',
  'tickVenue', 'tickHost', 'tickClubAdmin', 'tickPending', 'tickDone',
  'needsAction', 'claimedByYou', 'acceptCta', 'assignMyselfCta', 'claimForClubCta',
  'pickVenue', 'pickSlot', 'pickClub',
  'confirmAccept', 'confirmAcceptAnyOrder', 'confirmAssign', 'confirmAssignClubNext', 'confirmClaim', 'confirmClaimBody',
  'priceLabel', 'spotsLabel', 'expectedEarnings',
  'waitingVenue', 'waitingHost', 'waitingClub', 'waitingFor', 'roleVenue', 'roleHost', 'roleClub',
  'locationLabel', 'allLocations', 'changeLocation', 'categoryLabel', 'allCategories', 'noHostCategories',
  'pinnedTo', 'unpinned', 'virtualPod', 'pickLocationFirst', 'willPinTo', 'noVenueInCity', 'noClubInCity',
  'modePhysical', 'modeVirtual', 'pricedByHost',
  'meetingHint', 'meetingPlatform', 'meetingPlatformOther', 'meetingLink', 'meetingStart', 'meetingEnd',
  'venueLabel', 'noVenues', 'venueCategory', 'venueCategoriesMany', 'noVenueCategory', 'pickVenueFirst',
  'expiresIn', 'slotWindow', 'potentialEarning', 'slotNotViable', 'acceptingWith',
  'assignedVenue', 'assignedHost', 'assignedClub',
  'withdrawCta', 'withdrawTitle', 'withdrawWarning', 'withdrawPenalty', 'withdrawConfirm', 'withdrawn',
  'ticketPrice', 'spotsField', 'spotsRange', 'projectionTitle',
  'projectionHost', 'projectionVenue', 'projectionClub', 'projectionFees', 'projectionNotViable',
  'liveNow', 'viewPod', 'cancelled', 'expired', 'claimedElsewhere', 'dismiss',
  'emptyVenue', 'emptyHost', 'emptyClub',
  'noSlots', 'addAvailability', 'loadFailed', 'retry',
  'viewEarningsCta', 'earningsTitle', 'earningsSpacesHint', 'earningsSpaceCapacity',
  'earningsWholeVenue', 'earningsNoSpaces', 'earningsFormula', 'earningsTotalSpots',
  'earningsAddPrice', 'earningsPricePositive', 'earningsEnterPrice', 'earningsUnknown',
  'close', 'closeAria',
].toSorted((a, b) => a.localeCompare(b));

/**
 * The two confirm bodies were reworded when enrolment stopped being
 * venue-first, and the host's again when the dialog started naming the club
 * admin as who it waits on; the label field kept its name, the bundle row did
 * not. Rewording in place is not an option — "Import app keys" never
 * overwrites an existing row, so new wording needs a new key.
 */
const BUNDLE_KEY_OF: Record<string, string> = {
  confirmAcceptBody: 'confirmAcceptAnyOrder',
  confirmAssignBody: 'confirmAssignClubNext',
};

const CITY = 'Bengaluru, Karnataka';

interface Call {
  key: string;
  vars?: Record<string, string | number>;
}

/**
 * A translator that answers every key with a marker built from the key and
 * remembers what it was asked — so a test can tell "came out of the translator"
 * from "hard-coded in the package", and can see which namespace was consulted.
 */
const recorder = () => {
  const calls: Call[] = [];
  const t: AutoPodTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

/** A translator with real copy for a few keys that fills `{var}` placeholders the way the runtime does. */
const interpolating =
  (copy: Record<string, string>): AutoPodTranslate =>
  (key, options) => {
    let out = copy[key] ?? key;
    for (const [name, value] of Object.entries(options?.vars ?? {})) {
      out = out.replace(`{${name}}`, String(value));
    }
    return out;
  };

/** Read every label the way the surfaces do: each static field, each closure for each role, the earnings line. */
const exercise = (labels: AutoPodLabels): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(labels)) {
    if (typeof value === 'string') out[name] = value;
  }
  for (const role of ROLES) {
    out[`tick:${role}`] = labels.tick(role);
    out[`waitingOn:${role}`] = labels.waitingOn(role);
    out[`empty:${role}`] = labels.empty(role);
    out[`assignedHeading:${role}`] = labels.assignedHeading(role);
  }
  out.expectedEarnings = labels.expectedEarnings('₹1,200');
  out.waitingFor = labels.waitingFor(ROLES);
  out.pinnedTo = labels.pinnedTo(CITY);
  out.willPinTo = labels.willPinTo(CITY);
  out.noVenueInCity = labels.noVenueInCity(CITY);
  out.noClubInCity = labels.noClubInCity(CITY);
  out.venueCategory = labels.venueCategory('Sports › Racket › Badminton');
  out.venueCategories = labels.venueCategories(['Sports › Racket › Badminton', 'Fitness › Yoga › Hatha']);
  out.expiresIn = labels.expiresIn(5, 12, 30);
  out.slotWindow = labels.slotWindow(7);
  out.potentialEarning = labels.potentialEarning('₹1,080');
  out.acceptingWith = labels.acceptingWith('Play Arena');
  out.withdrawPenalty = labels.withdrawPenalty(5);
  out.spotsRange = labels.spotsRange(4, 12);
  out.projectionHost = labels.projectionHost('₹3,200');
  out.projectionVenue = labels.projectionVenue('₹1,200');
  out.projectionClub = labels.projectionClub('₹300');
  out.projectionFees = labels.projectionFees('₹900');
  out.earningsSpaceCapacity = labels.earningsSpaceCapacity(6);
  out.earningsFormula = labels.earningsFormula('₹250', 6, '₹1,500');
  out.earningsTotalSpots = labels.earningsTotalSpots(20);
  return out;
};

describe.each([
  { surface: 'mWeb + native', build: mwebAutoPodLabels, ns: 'mweb.autoPods' },
  { surface: 'MUI portals', build: shellAutoPodLabels, ns: 'shell.autoPods' },
])('$surface labels ($ns.*)', ({ build, ns }) => {
  // Rule 38: nothing user-facing is hard-coded. Every static label is the
  // translation of `<namespace>.<fieldName>`, which is also what makes the
  // field names a 1:1 map onto the rows the admin panel seeds.
  it('resolves every static label through the translator, keyed by its own field name', () => {
    const statics = Object.entries(build(recorder().t)).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    );
    expect(statics.length).toBeGreaterThan(0);
    for (const [name, value] of statics) {
      expect(value).toBe(`t:${ns}.${BUNDLE_KEY_OF[name] ?? name}`);
    }
  });

  // The server stores one row per key path, so mWeb/native and the portals
  // cannot share rows — a builder must never reach across into the other
  // surface's namespace, or the bundle that surface ships will not have it.
  it('only ever consults its own namespace', () => {
    const { t, calls } = recorder();
    exercise(build(t));
    const foreign = calls.filter((c) => !c.key.startsWith(`${ns}.`)).map((c) => c.key);
    expect(calls.length).toBeGreaterThan(0);
    expect(foreign).toEqual([]);
  });

  // The third enrolment is the Club Admin, not the club as an entity — the
  // tick says so, even though the role is spelt `club`.
  it('picks the enrolment tick by role, naming the Club Admin for the club tick', () => {
    const labels = build(recorder().t);
    expect(labels.tick('venue')).toBe(`t:${ns}.tickVenue`);
    expect(labels.tick('host')).toBe(`t:${ns}.tickHost`);
    expect(labels.tick('club')).toBe(`t:${ns}.tickClubAdmin`);
  });

  it('names who the offer is still waiting on, per role', () => {
    const labels = build(recorder().t);
    expect(labels.waitingOn('venue')).toBe(`t:${ns}.waitingVenue`);
    expect(labels.waitingOn('host')).toBe(`t:${ns}.waitingHost`);
    expect(labels.waitingOn('club')).toBe(`t:${ns}.waitingClub`);
  });

  it('chooses the empty state for the role whose queue is being rendered', () => {
    const labels = build(recorder().t);
    expect(labels.empty('venue')).toBe(`t:${ns}.emptyVenue`);
    expect(labels.empty('host')).toBe(`t:${ns}.emptyHost`);
    expect(labels.empty('club')).toBe(`t:${ns}.emptyClub`);
  });

  it('fills the {amount} placeholder of the earnings line with the formatted amount it is given', () => {
    const t = interpolating({ [`${ns}.expectedEarnings`]: 'You could earn {amount}' });
    expect(build(t).expectedEarnings('₹1,200')).toBe('You could earn ₹1,200');
  });

  // `amount`, `roles` and `city` are the placeholder names the bundle copy
  // uses; passing one under any other name (or passing vars on a label that
  // has none) would leave a raw `{amount}` on screen.
  it('passes vars only on the lines that have a placeholder, under the bundle name', () => {
    const { t, calls } = recorder();
    exercise(build(t));
    const withVars = calls
      .filter((c) => c.vars !== undefined)
      .toSorted((a, b) => a.key.localeCompare(b.key));
    expect(withVars).toEqual([
      { key: `${ns}.acceptingWith`, vars: { venue: 'Play Arena' } },
      { key: `${ns}.earningsFormula`, vars: { price: '₹250', capacity: 6, total: '₹1,500' } },
      { key: `${ns}.earningsSpaceCapacity`, vars: { capacity: 6 } },
      { key: `${ns}.earningsTotalSpots`, vars: { spots: 20 } },
      { key: `${ns}.expectedEarnings`, vars: { amount: '₹1,200' } },
      { key: `${ns}.expiresIn`, vars: { hours: 5, minutes: 12, seconds: 30 } },
      { key: `${ns}.noClubInCity`, vars: { city: CITY } },
      { key: `${ns}.noVenueInCity`, vars: { city: CITY } },
      { key: `${ns}.pinnedTo`, vars: { city: CITY } },
      { key: `${ns}.potentialEarning`, vars: { amount: '₹1,080' } },
      { key: `${ns}.projectionClub`, vars: { amount: '₹300' } },
      { key: `${ns}.projectionFees`, vars: { amount: '₹900' } },
      { key: `${ns}.projectionHost`, vars: { amount: '₹3,200' } },
      { key: `${ns}.projectionVenue`, vars: { amount: '₹1,200' } },
      { key: `${ns}.slotWindow`, vars: { days: 7 } },
      { key: `${ns}.spotsRange`, vars: { min: 4, max: 12 } },
      { key: `${ns}.venueCategoriesMany`, vars: { paths: 'Sports › Racket › Badminton · Fitness › Yoga › Hatha' } },
      { key: `${ns}.venueCategory`, vars: { path: 'Sports › Racket › Badminton' } },
      { key: `${ns}.waitingFor`, vars: { roles: `t:${ns}.roleVenue, t:${ns}.roleHost, t:${ns}.roleClub` } },
      { key: `${ns}.willPinTo`, vars: { city: CITY } },
      { key: `${ns}.withdrawPenalty`, vars: { points: 5 } },
    ]);
  });

  // A venue in one category reads exactly as it always did — the singular row,
  // not a plural row holding one path — so no translator has to cover both.
  it('writes one category on the singular line and several on the plural one', () => {
    const t = interpolating({
      [`${ns}.venueCategory`]: 'Category: {path}',
      [`${ns}.venueCategoriesMany`]: 'Categories: {paths}',
    });
    expect(build(t).venueCategories(['Sports › Racket › Badminton'])).toBe('Category: Sports › Racket › Badminton');
    expect(build(t).venueCategories(['Sports › Racket › Badminton', 'Fitness › Yoga › Hatha'])).toBe(
      'Categories: Sports › Racket › Badminton · Fitness › Yoga › Hatha',
    );
  });

  // The server stores one row per key path and "Import app keys" seeds exactly
  // the rows the bundle ships — so rendering every label, every role and the
  // earnings line must ask for each bundle key, only bundle keys, and each one
  // once. A label renamed here but not mirrored in `@duncit/i18n` fails this
  // before it ships a key with no copy behind it.
  it('renders exactly the keys the bundle ships, each one once', () => {
    const { t, calls } = recorder();
    exercise(build(t));
    const keys = calls.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.map((k) => k.slice(ns.length + 1)).toSorted((a, b) => a.localeCompare(b))).toEqual(
      BUNDLE_KEYS,
    );
  });
});

describe('mWeb ↔ portal parity', () => {
  // The two namespaces exist only because the server keys rows by full path;
  // the copy is meant to be word-for-word identical. Given identical copy under
  // both prefixes, the two surfaces must therefore render identical labels —
  // same fields, same role selection, same placeholder handling.
  it('renders identical labels when both namespaces carry identical copy', () => {
    const mirror =
      (ns: string): AutoPodTranslate =>
      (key, options) => {
        const leaf = key.slice(ns.length + 1);
        return options?.vars ? `${leaf}(${JSON.stringify(options.vars)})` : leaf;
      };
    expect(exercise(mwebAutoPodLabels(mirror('mweb.autoPods')))).toEqual(
      exercise(shellAutoPodLabels(mirror('shell.autoPods'))),
    );
  });
});

describe('shellPodKindLabels', () => {
  const FIELDS = [
    'autoDesc',
    'autoTitle',
    'dismiss',
    'newPodCta',
    'normalDesc',
    'normalTitle',
    'subtitle',
    'title',
  ];

  it('offers the button, the question and both answers, each resolved under shell.podKind.<field>', () => {
    const labels = shellPodKindLabels(recorder().t);
    expect(Object.keys(labels).toSorted((a, b) => a.localeCompare(b))).toEqual(FIELDS);
    for (const [name, value] of Object.entries(labels)) {
      expect(value).toBe(`t:shell.podKind.${name}`);
    }
  });

  // `dismiss` also exists under `shell.autoPods`, but the pod-kind dialog has
  // its own row — a builder that borrowed the Auto Pod copy would break the
  // moment a translator wrote the two differently.
  it('asks for each key exactly once, plainly, and never borrows from the Auto Pod namespace', () => {
    const { t, calls } = recorder();
    shellPodKindLabels(t);
    expect(calls.map((c) => c.key).toSorted((a, b) => a.localeCompare(b))).toEqual(
      FIELDS.map((f) => `shell.podKind.${f}`),
    );
    expect(calls.every((c) => c.vars === undefined)).toBe(true);
  });
});

describe('mwebPodKindLabels', () => {
  const FIELDS = [
    'autoDesc',
    'autoTitle',
    'dismiss',
    'newPodCta',
    'normalDesc',
    'normalTitle',
    'subtitle',
    'title',
  ];

  it('offers mWeb and native the same button, question and answers, under mweb.podKind.<field>', () => {
    const labels = mwebPodKindLabels(recorder().t);
    expect(Object.keys(labels).toSorted((a, b) => a.localeCompare(b))).toEqual(FIELDS);
    for (const [name, value] of Object.entries(labels)) {
      expect(value).toBe(`t:mweb.podKind.${name}`);
    }
  });

  // One namespace for both apps (rule 27); the portals' twin differs only in
  // its prefix, so the two builders must never drift in shape.
  it('mirrors the portal builder field for field, asking for each key once', () => {
    const { t, calls } = recorder();
    expect(Object.keys(mwebPodKindLabels(t))).toEqual(Object.keys(shellPodKindLabels(recorder().t)));
    expect(calls.map((c) => c.key).toSorted((a, b) => a.localeCompare(b))).toEqual(
      FIELDS.map((f) => `mweb.podKind.${f}`),
    );
    expect(calls.every((c) => c.vars === undefined)).toBe(true);
  });
});

const BADMINTON: VenueCategoryEntry = {
  super_category_id: 'sup-sports',
  category_id: 'cat-racket',
  sub_category_id: 'sub-badminton',
  super_category_name: 'Sports',
  category_name: 'Racket',
  sub_category_name: 'Badminton',
};
const HATHA: VenueCategoryEntry = {
  super_category_id: 'sup-fitness',
  category_id: 'cat-yoga',
  sub_category_id: 'sub-hatha',
  super_category_name: 'Fitness',
  category_name: 'Yoga',
  sub_category_name: 'Hatha',
};
const TENNIS: VenueCategoryEntry = {
  super_category_id: 'sup-sports',
  category_id: 'cat-racket',
  sub_category_id: 'sub-tennis',
  super_category_name: 'Sports',
  category_name: 'Racket',
  sub_category_name: 'Tennis',
};
/** What a venue with no category answers `venue_category` with: every field blank. */
const BLANK: VenueCategoryEntry = {
  super_category_id: null,
  category_id: null,
  sub_category_id: null,
  super_category_name: '',
  category_name: '',
  sub_category_name: '',
};

describe('venueCategoryList', () => {
  it('answers the list, primary first, when the venue carries one', () => {
    expect(venueCategoryList({ venue_categories: [BADMINTON, HATHA], venue_category: BADMINTON })).toEqual([
      BADMINTON,
      HATHA,
    ]);
  });

  // A venue fetched by a build that only selects the old field, or stored before the list existed.
  it('reads the legacy single triple as a one-entry list', () => {
    expect(venueCategoryList({ venue_category: BADMINTON })).toEqual([BADMINTON]);
    expect(venueCategoryList({ venue_categories: [], venue_category: BADMINTON })).toEqual([BADMINTON]);
    expect(venueCategoryList({ venue_categories: null, venue_category: BADMINTON })).toEqual([BADMINTON]);
  });

  it('drops blank entries, so a venue with no category has an empty list', () => {
    expect(venueCategoryList({ venue_categories: [BLANK], venue_category: BLANK })).toEqual([]);
    expect(venueCategoryList({ venue_categories: [BLANK, HATHA] })).toEqual([HATHA]);
    expect(venueCategoryList({ venue_category: null })).toEqual([]);
    expect(venueCategoryList({})).toEqual([]);
  });

  it('is empty for no venue at all', () => {
    expect(venueCategoryList(null)).toEqual([]);
    expect(venueCategoryList(undefined)).toEqual([]);
  });

  it('keeps an entry that only has names — the shape a names-only query answers', () => {
    const namesOnly = { super_category_name: 'Sports', category_name: 'Racket', sub_category_name: 'Badminton' };
    expect(venueCategoryList({ venue_categories: [namesOnly] })).toEqual([namesOnly]);
  });
});

describe('venueCategoryPaths', () => {
  it('writes every category as Super › Category › Sub, primary first', () => {
    expect(venueCategoryPaths({ venue_categories: [BADMINTON, HATHA] })).toEqual([
      'Sports › Racket › Badminton',
      'Fitness › Yoga › Hatha',
    ]);
  });

  it('skips a missing level instead of leaving a dangling separator', () => {
    expect(venueCategoryPaths({ venue_category: { ...BADMINTON, category_name: '' } })).toEqual(['Sports › Badminton']);
  });

  it('drops an entry that has ids but no names, and is empty for a venue with no category', () => {
    expect(venueCategoryPaths({ venue_categories: [{ sub_category_id: 'sub-x' }, HATHA] })).toEqual([
      'Fitness › Yoga › Hatha',
    ]);
    expect(venueCategoryPaths({ venue_category: BLANK })).toEqual([]);
    expect(venueCategoryPaths(null)).toEqual([]);
  });
});

describe('venueCategoryLevelIds', () => {
  const venue = { venue_categories: [BADMINTON, HATHA, TENNIS] };

  it('lists the distinct ids at a level, primary first', () => {
    expect(venueCategoryLevelIds(venue, 'sub_category_id')).toEqual(['sub-badminton', 'sub-hatha', 'sub-tennis']);
    // Badminton and Tennis share a middle Category and a Super: each is listed once.
    expect(venueCategoryLevelIds(venue, 'category_id')).toEqual(['cat-racket', 'cat-yoga']);
    expect(venueCategoryLevelIds(venue, 'super_category_id')).toEqual(['sup-sports', 'sup-fitness']);
  });

  it('skips entries with no id at that level', () => {
    expect(
      venueCategoryLevelIds({ venue_categories: [{ ...BADMINTON, category_id: null }, HATHA] }, 'category_id'),
    ).toEqual(['cat-yoga']);
  });

  it('falls back to the legacy triple, and is empty with no venue', () => {
    expect(venueCategoryLevelIds({ venue_category: HATHA }, 'category_id')).toEqual(['cat-yoga']);
    expect(venueCategoryLevelIds(null, 'category_id')).toEqual([]);
  });
});

describe('venueCategoryLabels', () => {
  it('answers every label, primary first', () => {
    expect(venueCategoryLabels({ category: 'Badminton', categories: ['Badminton', 'Yoga'] })).toEqual(['Badminton', 'Yoga']);
  });

  // An answer cached from before the list existed, or a venue the server gave no list for.
  it('falls back to the lone primary label', () => {
    expect(venueCategoryLabels({ category: 'Badminton' })).toEqual(['Badminton']);
    expect(venueCategoryLabels({ category: 'Badminton', categories: [] })).toEqual(['Badminton']);
    expect(venueCategoryLabels({ category: 'Badminton', categories: null })).toEqual(['Badminton']);
  });

  it('drops blank labels and is empty for a venue with no category', () => {
    expect(venueCategoryLabels({ category: 'Badminton', categories: ['', 'Yoga'] })).toEqual(['Yoga']);
    expect(venueCategoryLabels({ category: '', categories: [''] })).toEqual([]);
    expect(venueCategoryLabels({})).toEqual([]);
    expect(venueCategoryLabels(null)).toEqual([]);
    expect(venueCategoryLabels(undefined)).toEqual([]);
  });
});

describe('venueHostsSubCategory', () => {
  // The case the single-category comparison got wrong: the Auto Pod's sub
  // category is the venue's SECOND category, so the venue is eligible.
  it('matches an Auto Pod on the venue’s second category', () => {
    const venue = { venue_categories: [BADMINTON, HATHA], venue_category: BADMINTON };
    expect(venueHostsSubCategory(venue, 'sub-hatha')).toBe(true);
    expect(venueHostsSubCategory(venue, 'sub-badminton')).toBe(true);
  });

  it('does not match a sub category none of the venue’s categories carries', () => {
    expect(venueHostsSubCategory({ venue_categories: [BADMINTON, HATHA] }, 'sub-tennis')).toBe(false);
  });

  it('matches a legacy single-category venue on that category only', () => {
    expect(venueHostsSubCategory({ venue_category: BADMINTON }, 'sub-badminton')).toBe(true);
    expect(venueHostsSubCategory({ venue_category: BADMINTON }, 'sub-hatha')).toBe(false);
  });

  it('is false when either side has no sub category', () => {
    expect(venueHostsSubCategory({ venue_categories: [BADMINTON] }, '')).toBe(false);
    expect(venueHostsSubCategory({ venue_categories: [BADMINTON] }, null)).toBe(false);
    expect(venueHostsSubCategory({ venue_categories: [BADMINTON] })).toBe(false);
    expect(venueHostsSubCategory({ venue_category: BLANK }, 'sub-badminton')).toBe(false);
    expect(venueHostsSubCategory(null, 'sub-badminton')).toBe(false);
  });
});
