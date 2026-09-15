import { describe, expect, it } from 'vitest';
import type { TicketDiscountIssueCode } from '../src/pod-ticket-discount';
import {
  mwebTicketDiscountLabels,
  podFormTicketDiscountLabels,
  shellTicketDiscountLabels,
  type TicketDiscountLabels,
  type TicketDiscountLimits,
  type TicketDiscountTranslate,
} from '../src/pod-ticket-discount-copy';

type Builder = (t: TicketDiscountTranslate) => TicketDiscountLabels;
type Vars = Record<string, string | number> | undefined;

/**
 * A translator that records every call and answers with a marker built from
 * the key — `t:<key>`, never the bare key — so a test can tell "came out of
 * the translator" from "the key string hard-coded in the package".
 */
const recorder = () => {
  const calls: { key: string; vars: Vars }[] = [];
  const t: TicketDiscountTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

/** A translator over a tiny catalogue, substituting `{name}` placeholders the way `@duncit/i18n` does. */
const catalogue =
  (entries: Record<string, string>): TicketDiscountTranslate =>
  (key, options) =>
    (entries[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
      String(options?.vars?.[name] ?? match),
    );

/** DUN-POD-4821 on a 12-spot pod under the default 50% cap. */
const LIMITS: TicketDiscountLimits = { maxPct: 50, maxTickets: 11, maxTiers: 10 };

const STATIC_PROPS = [
  'title', 'switchLabel', 'hint', 'baseRow', 'ticketsLabel', 'discountLabel', 'addTier', 'removeTier',
] as const satisfies readonly (keyof TicketDiscountLabels)[];

/** Each issue code, the bundle key suffix it renders and the vars it passes. */
const ERRORS: readonly [TicketDiscountIssueCode, string, Vars][] = [
  ['TIERS_REQUIRED', 'errorTiersRequired', undefined],
  ['TOO_MANY_TIERS', 'errorTooManyTiers', { max: 10 }],
  ['TICKETS_MIN', 'errorTicketsMin', undefined],
  ['TICKETS_MAX', 'errorTicketsMax', { max: 11 }],
  ['TICKETS_NOT_INCREASING', 'errorTicketsNotIncreasing', undefined],
  ['PCT_MIN', 'errorPctMin', undefined],
  ['PCT_MAX', 'errorPctMax', { max: 50 }],
  ['PCT_NOT_INCREASING', 'errorPctNotIncreasing', undefined],
];

/** Every key suffix the `ticketDiscount` block of each bundle ships. */
const BUNDLE_KEYS = [
  ...STATIC_PROPS,
  'maxHint',
  'perTicket',
  ...ERRORS.map(([, suffix]) => suffix),
].toSorted((a, b) => a.localeCompare(b));

/** Build with a recorder and invoke every dynamic label once. */
const renderEverything = (build: Builder): string[] => {
  const { t, calls } = recorder();
  const labels = build(t);
  labels.maxHint(50);
  labels.perTicket('₹449.10');
  for (const [code] of ERRORS) labels.errors[code](LIMITS);
  return calls.map((c) => c.key);
};

const NAMESPACES = [
  ['mweb', mwebTicketDiscountLabels],
  ['shell', shellTicketDiscountLabels],
  ['podForm', podFormTicketDiscountLabels],
] as const;

describe.each(NAMESPACES)('%s namespace', (namespace, build) => {
  const prefix = `${namespace}.ticketDiscount.`;

  it('only ever asks the translator for keys under its own prefix', () => {
    const keys = renderEverything(build);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => k.startsWith(prefix))).toBe(true);
  });

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

  it('passes the cap and the price through as named vars', () => {
    const { t, calls } = recorder();
    const labels = build(t);
    calls.length = 0;
    expect(labels.maxHint(40)).toBe(`t:${prefix}maxHint`);
    expect(labels.perTicket('₹399.20')).toBe(`t:${prefix}perTicket`);
    expect(calls).toEqual([
      { key: `${prefix}maxHint`, vars: { max: 40 } },
      { key: `${prefix}perTicket`, vars: { price: '₹399.20' } },
    ]);
  });

  it.each(ERRORS)('words %s with its own key and quotes the right limit', (code, suffix, vars) => {
    const { t, calls } = recorder();
    const labels = build(t);
    calls.length = 0;
    expect(labels.errors[code](LIMITS)).toBe(`t:${prefix}${suffix}`);
    expect(calls).toEqual([{ key: `${prefix}${suffix}`, vars }]);
  });

  it('fills the bundle placeholders by the names the bundle uses', () => {
    const labels = build(
      catalogue({
        [`${prefix}maxHint`]: 'Up to {max}% off',
        [`${prefix}perTicket`]: '{price} per ticket',
        [`${prefix}errorTooManyTiers`]: 'You can add up to {max} tiers',
        [`${prefix}errorTicketsMax`]: 'Tickets can’t be more than {max}',
        [`${prefix}errorPctMax`]: 'Discount can’t be more than {max}%',
      }),
    );
    expect(labels.maxHint(50)).toBe('Up to 50% off');
    expect(labels.perTicket('₹449.10')).toBe('₹449.10 per ticket');
    expect(labels.errors.TOO_MANY_TIERS(LIMITS)).toBe('You can add up to 10 tiers');
    expect(labels.errors.TICKETS_MAX(LIMITS)).toBe('Tickets can’t be more than 11');
    expect(labels.errors.PCT_MAX(LIMITS)).toBe('Discount can’t be more than 50%');
    expect(labels.title).toBe(`<missing ${prefix}title>`);
  });
});

// The three namespaces are promised word-for-word identical; rendering the
// SAME key suffixes is what keeps a label added to one builder from being
// forgotten in the others.
describe('mweb, shell and podForm namespaces', () => {
  it('render the identical sequence of key suffixes', () => {
    const suffixes = (build: Builder, prefix: string) =>
      renderEverything(build).map((k) => k.slice(prefix.length));
    const mweb = suffixes(mwebTicketDiscountLabels, 'mweb.ticketDiscount.');
    expect(suffixes(shellTicketDiscountLabels, 'shell.ticketDiscount.')).toEqual(mweb);
    expect(suffixes(podFormTicketDiscountLabels, 'podForm.ticketDiscount.')).toEqual(mweb);
  });
});
