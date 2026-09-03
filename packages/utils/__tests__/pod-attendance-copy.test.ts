import { describe, expect, it } from 'vitest';
import type { AttendanceMarkMethod, PodAttendanceLock } from '../src/pod-attendance';
import {
  buildAttendanceLabels,
  earningsBodyFor,
  mwebAttendanceLabels,
  shellAttendanceLabels,
  type AttendanceTranslate,
  type PodAttendanceLabels,
} from '../src/pod-attendance-copy';

type Builder = (t: AttendanceTranslate) => PodAttendanceLabels;
type Vars = Record<string, string | number> | undefined;

/**
 * A translator that records every call and answers with a marker built from
 * the key — `t:<key>`, never the bare key — so a test can tell "came out of
 * the translator" from "the key string hard-coded in the package".
 */
const recorder = () => {
  const calls: { key: string; vars: Vars }[] = [];
  const t: AttendanceTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

/**
 * A translator over a tiny catalogue, substituting `{name}` placeholders the
 * same way `@duncit/i18n` does — so a label whose var NAME drifts from the
 * bundle's placeholder shows up as a literal `{name}` left in the sentence.
 */
const catalogue =
  (entries: Record<string, string>): AttendanceTranslate =>
  (key, options) =>
    (entries[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
      String(options?.vars?.[name] ?? match),
    );

const METHODS: readonly AttendanceMarkMethod[] = [
  'HOST_SCAN',
  'HOST_MANUAL',
  'CLUB_ADMIN_FORCE',
  'VIRTUAL_JOIN',
  'ADMIN',
];
const LOCKS: readonly PodAttendanceLock[] = ['OPEN', 'COMPLETED', 'CANCELLED'];

/** Label props that are plain strings, i.e. resolved once when the bundle is built. */
const STATIC_PROPS = [
  'pageTitle', 'menuItem', 'markedHeading', 'unmarkedHeading', 'emptyRoster', 'allMarked',
  'markButton', 'marking', 'markedChip', 'notMarkedChip', 'scanCta', 'earningsTitle', 'earningsBody', 'earningsBodyVirtual',
  'clubAdminTitle', 'clubAdminBody', 'clubAdminNone', 'contactEmail', 'contactPhone', 'contactWhatsapp',
  'retry', 'back', 'otpTitle', 'otpName', 'otpExtension', 'otpPhone', 'otpMediumLabel',
  'otpMediumWhatsapp', 'otpMediumSms', 'otpMediumRequired', 'otpNameRequired', 'otpExtensionInvalid',
  'otpPhoneInvalid', 'otpSend', 'otpSending', 'otpResend', 'otpCode', 'otpCodeInvalid', 'otpVerify',
  'otpVerifying', 'otpVerified', 'otpCancel', 'forceTitle', 'forceWarning', 'forceConfirm', 'forceCancel',
  'chooseBody', 'chooseOtpTitle', 'chooseOtpBody', 'chooseDirectTitle', 'chooseDirectBody', 'chooseCancel',
  'forceCompanionsTitle', 'forceCompanionName', 'forceCompanionPhone',
] as const satisfies readonly (keyof PodAttendanceLabels)[];

/**
 * Every key either namespace renders — the `attendance` block of both
 * `@duncit/i18n` bundles. A rename in the source that is not mirrored there
 * (and re-imported via "Import app keys") ships a key with no copy behind it.
 */
const BUNDLE_KEYS = [
  ...STATIC_PROPS,
  'summary', 'seatsSummary', 'seats', 'companionsNeeded', 'markedBy', 'markedAt', 'verifiedPhone',
  'methodScan', 'methodManual', 'methodClubAdmin', 'methodVirtualJoin', 'methodAdmin',
  'lockedCompletedTitle', 'lockedCompletedBody', 'lockedCancelledTitle', 'lockedCancelledBody',
  'otpBody', 'otpTestCode', 'chooseTitle', 'forceCompanionsBody',
].toSorted((a, b) => a.localeCompare(b));

/** Build with a recorder and invoke each dynamic label once per distinct variant. */
const renderEverything = (build: Builder): string[] => {
  const { t, calls } = recorder();
  const labels = build(t);
  labels.summary(1, 2);
  labels.seatsSummary(1, 2);
  labels.seats(1);
  labels.companionsNeeded(1);
  labels.markedBy('Asha');
  labels.markedAt('today');
  labels.verifiedPhone('+91 9876543210');
  for (const method of METHODS) labels.methodLabel(method);
  for (const lock of ['COMPLETED', 'CANCELLED'] as const) {
    labels.lockedTitle(lock);
    labels.lockedBody(lock);
  }
  labels.otpBody('Asha');
  labels.otpTestCode('123456');
  labels.chooseTitle('Asha');
  labels.forceCompanionsBody(8, 7);
  return calls.map((c) => c.key);
};

const NAMESPACES = [
  ['mweb', mwebAttendanceLabels],
  ['shell', shellAttendanceLabels],
] as const;

describe('buildAttendanceLabels', () => {
  it('hands mWeb and the native app the mweb.* namespace', () => {
    expect(renderEverything((t) => buildAttendanceLabels(t, 'mweb'))).toEqual(
      renderEverything(mwebAttendanceLabels),
    );
  });

  it('hands every MUI portal the shell.* namespace', () => {
    expect(renderEverything((t) => buildAttendanceLabels(t, 'shell'))).toEqual(
      renderEverything(shellAttendanceLabels),
    );
  });
});

describe.each(NAMESPACES)('%s namespace', (namespace, build) => {
  const prefix = `${namespace}.attendance.`;

  it('only ever asks the translator for keys under its own prefix', () => {
    const keys = renderEverything(build);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => k.startsWith(prefix))).toBe(true);
  });

  // The server stores one row per key path, so the two namespaces cannot
  // collapse into one — instead each must ship the full attendance block.
  it('renders exactly the keys the bundle ships, each one once', () => {
    const keys = renderEverything(build);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.map((k) => k.slice(prefix.length)).toSorted((a, b) => a.localeCompare(b))).toEqual(
      BUNDLE_KEYS,
    );
  });

  it('resolves every static label through the translator, keyed by its own property, with no vars', () => {
    const { t, calls } = recorder();
    const labels = build(t);
    for (const prop of STATIC_PROPS) {
      expect(labels[prop]).toBe(`t:${prefix}${prop}`);
    }
    expect(calls.every((c) => c.vars === undefined)).toBe(true);
    expect(calls).toHaveLength(STATIC_PROPS.length);
  });

  it('returns the translated sentence verbatim, not the key', () => {
    const labels = build(catalogue({ [`${prefix}markButton`]: 'Mark Attendance' }));
    expect(labels.markButton).toBe('Mark Attendance');
    expect(labels.pageTitle).toBe(`<missing ${prefix}pageTitle>`);
  });

  it.each<[keyof PodAttendanceLabels, (l: PodAttendanceLabels) => string, string, Vars]>([
    ['summary', (l) => l.summary(3, 5), 'summary', { marked: 3, total: 5 }],
    ['seatsSummary', (l) => l.seatsSummary(4, 9), 'seatsSummary', { marked: 4, total: 9 }],
    ['seats', (l) => l.seats(2), 'seats', { count: 2 }],
    ['companionsNeeded', (l) => l.companionsNeeded(3), 'companionsNeeded', { count: 3 }],
    ['markedBy', (l) => l.markedBy('Asha'), 'markedBy', { name: 'Asha' }],
    ['markedAt', (l) => l.markedAt('10:30'), 'markedAt', { when: '10:30' }],
    ['verifiedPhone', (l) => l.verifiedPhone('+91 98765'), 'verifiedPhone', { phone: '+91 98765' }],
    ['otpBody', (l) => l.otpBody('Ravi'), 'otpBody', { name: 'Ravi' }],
    ['otpTestCode', (l) => l.otpTestCode('123456'), 'otpTestCode', { code: '123456' }],
    ['chooseTitle', (l) => l.chooseTitle('Asha'), 'chooseTitle', { name: 'Asha' }],
    [
      'forceCompanionsBody',
      (l) => l.forceCompanionsBody(8, 7),
      'forceCompanionsBody',
      { seats: 8, count: 7 },
    ],
  ])('%s passes its arguments through as named vars', (_label, invoke, suffix, vars) => {
    const { t, calls } = recorder();
    const labels = build(t);
    calls.length = 0;
    expect(invoke(labels)).toBe(`t:${prefix}${suffix}`);
    expect(calls).toEqual([{ key: `${prefix}${suffix}`, vars }]);
  });

  // The var names must match the bundle's placeholders — `{marked}`, not
  // `{done}` — or the sentence renders with the brace left in it.
  it('fills the bundle placeholders by the names the bundle uses', () => {
    const labels = build(
      catalogue({
        [`${prefix}summary`]: '{marked} of {total} attendees marked',
        [`${prefix}seatsSummary`]: '{marked} of {total} seats marked',
        [`${prefix}seats`]: 'Admits {count}',
        [`${prefix}companionsNeeded`]: 'Add the other {count} on this booking at the door first.',
        [`${prefix}markedBy`]: 'Marked by {name}',
        [`${prefix}markedAt`]: 'Marked {when}',
        [`${prefix}verifiedPhone`]: 'Verified {phone}',
        [`${prefix}otpBody`]: 'Send {name} a one-time code and enter it here.',
        [`${prefix}otpTestCode`]: 'Enter the test code {code}.',
      }),
    );
    expect(labels.summary(3, 5)).toBe('3 of 5 attendees marked');
    expect(labels.seatsSummary(0, 12)).toBe('0 of 12 seats marked');
    expect(labels.seats(4)).toBe('Admits 4');
    expect(labels.companionsNeeded(2)).toBe('Add the other 2 on this booking at the door first.');
    expect(labels.markedBy('Asha')).toBe('Marked by Asha');
    expect(labels.markedAt('2 min ago')).toBe('Marked 2 min ago');
    expect(labels.verifiedPhone('+91 9876543210')).toBe('Verified +91 9876543210');
    expect(labels.otpBody('Ravi')).toBe('Send Ravi a one-time code and enter it here.');
    expect(labels.otpTestCode('424242')).toBe('Enter the test code 424242.');
  });

  // Four ways in, one write (rule 41): the roster must say WHICH path marked
  // the ticket, because a Club Admin override and a Duncit admin mark carry
  // no scan behind them and the host should see that.
  it.each<[AttendanceMarkMethod, string]>([
    ['HOST_SCAN', 'methodScan'],
    ['HOST_MANUAL', 'methodManual'],
    ['CLUB_ADMIN_FORCE', 'methodClubAdmin'],
    ['ADMIN', 'methodAdmin'],
  ])('labels a %s mark with its own copy', (method, suffix) => {
    const labels = build(recorder().t);
    expect(labels.methodLabel(method)).toBe(`t:${prefix}${suffix}`);
  });

  it('gives every mark method a distinct label', () => {
    const labels = build(recorder().t);
    expect(new Set(METHODS.map((m) => labels.methodLabel(m))).size).toBe(METHODS.length);
  });

  it('explains a cancelled roster differently from a completed one', () => {
    const labels = build(recorder().t);
    expect(labels.lockedTitle('CANCELLED')).toBe(`t:${prefix}lockedCancelledTitle`);
    expect(labels.lockedBody('CANCELLED')).toBe(`t:${prefix}lockedCancelledBody`);
    expect(labels.lockedTitle('COMPLETED')).toBe(`t:${prefix}lockedCompletedTitle`);
    expect(labels.lockedBody('COMPLETED')).toBe(`t:${prefix}lockedCompletedBody`);
  });

  // An OPEN roster never renders the lock banner, so there are only two real
  // variants of the locked copy; anything that is not a cancellation reads as
  // the completed-and-settled case.
  it('treats any non-cancelled lock as the completed copy', () => {
    const labels = build(recorder().t);
    for (const lock of LOCKS.filter((l) => l !== 'CANCELLED')) {
      expect(labels.lockedTitle(lock)).toBe(`t:${prefix}lockedCompletedTitle`);
      expect(labels.lockedBody(lock)).toBe(`t:${prefix}lockedCompletedBody`);
    }
  });
});

// The doc comment promises the two namespaces are word-for-word identical;
// the cheapest way to keep that true is for them to render the SAME key
// suffixes — a label added to one builder and forgotten in the other fails here.
describe('mweb and shell namespaces', () => {
  it('render the identical set of key suffixes', () => {
    const suffixes = (build: Builder, prefix: string) =>
      renderEverything(build).map((k) => k.slice(prefix.length));
    expect(suffixes(mwebAttendanceLabels, 'mweb.attendance.')).toEqual(
      suffixes(shellAttendanceLabels, 'shell.attendance.'),
    );
  });
});

describe('earningsBodyFor', () => {
  const labels = { earningsBody: 'Unmarked seats are seats you are not paid for.', earningsBodyVirtual: 'A member who never opens the link is a seat you are not paid for.' };

  it('words the payout rule for the kind of pod this is', () => {
    expect(earningsBodyFor({ pod_mode: 'VIRTUAL' }, labels)).toBe(labels.earningsBodyVirtual);
    expect(earningsBodyFor({ pod_mode: 'PHYSICAL' }, labels)).toBe(labels.earningsBody);
  });

  it('reads both wordings out of a built bundle rather than a literal', () => {
    const built = mwebAttendanceLabels((key) => 't:' + key);

    expect(earningsBodyFor({ pod_mode: 'PHYSICAL' }, built)).toBe('t:mweb.attendance.earningsBody');
    expect(earningsBodyFor({ pod_mode: 'VIRTUAL' }, built)).toBe('t:mweb.attendance.earningsBodyVirtual');
  });
});
