import { describe, expect, it } from 'vitest';
import type { AutoPodRole } from '../src/auto-pod';
import {
  mwebAutoPodLabels,
  shellAutoPodLabels,
  shellPodKindLabels,
  type AutoPodLabels,
  type AutoPodTranslate,
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
  'confirmAccept', 'confirmAcceptAnyOrder', 'confirmAssign', 'confirmAssignAnyOrder', 'confirmClaim', 'confirmClaimBody',
  'priceLabel', 'spotsLabel', 'expectedEarnings',
  'waitingVenue', 'waitingHost', 'waitingClub', 'waitingFor', 'roleVenue', 'roleHost', 'roleClub',
  'locationLabel', 'allLocations', 'changeLocation', 'categoryLabel', 'allCategories', 'noHostCategories',
  'pinnedTo', 'unpinned', 'virtualPod', 'pickLocationFirst', 'willPinTo', 'noVenueInCity', 'noClubInCity',
  'venueLabel', 'noVenues', 'venueCategory', 'noVenueCategory', 'pickVenueFirst',
  'expiresIn', 'slotWindow', 'potentialEarning', 'slotNotViable', 'acceptingWith',
  'assignedVenue', 'assignedHost', 'assignedClub',
  'withdrawCta', 'withdrawTitle', 'withdrawWarning', 'withdrawPenalty', 'withdrawConfirm', 'withdrawn',
  'ticketPrice', 'spotsField', 'spotsRange', 'projectionTitle',
  'projectionHost', 'projectionVenue', 'projectionClub', 'projectionFees', 'projectionNotViable',
  'liveNow', 'viewPod', 'cancelled', 'expired', 'claimedElsewhere', 'dismiss',
  'emptyVenue', 'emptyHost', 'emptyClub',
  'noSlots', 'addAvailability', 'loadFailed', 'retry',
].toSorted((a, b) => a.localeCompare(b));

/**
 * The two confirm bodies were reworded when enrolment stopped being
 * venue-first; the label field kept its name, the bundle row did not.
 */
const BUNDLE_KEY_OF: Record<string, string> = {
  confirmAcceptBody: 'confirmAcceptAnyOrder',
  confirmAssignBody: 'confirmAssignAnyOrder',
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
      { key: `${ns}.venueCategory`, vars: { path: 'Sports › Racket › Badminton' } },
      { key: `${ns}.waitingFor`, vars: { roles: `t:${ns}.roleVenue, t:${ns}.roleHost, t:${ns}.roleClub` } },
      { key: `${ns}.willPinTo`, vars: { city: CITY } },
      { key: `${ns}.withdrawPenalty`, vars: { points: 5 } },
    ]);
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
