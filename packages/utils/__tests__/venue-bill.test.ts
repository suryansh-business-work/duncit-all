import { describe, expect, it } from 'vitest';
import {
  buildVenueBillLines,
  firstMediaUrl,
  mwebVenueBillLabels,
  shellVenueBillLabels,
  type VenueBillLabels,
  type VenueBillTerms,
  type VenueBillTranslate,
} from '../src/venue-bill';

type Builder = (t: VenueBillTranslate) => VenueBillLabels;
type Vars = Record<string, string | number> | undefined;

/**
 * A translator that records every call and answers with a marker built from
 * the key — `t:<key>`, never the bare key — so a test can tell "came out of
 * the translator" from "the key string hard-coded in the package".
 */
const recorder = () => {
  const calls: { key: string; vars: Vars }[] = [];
  const t: VenueBillTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

/** A translator over a tiny catalogue, substituting `{name}` placeholders the way `@duncit/i18n` does. */
const catalogue =
  (entries: Record<string, string>): VenueBillTranslate =>
  (key, options) =>
    (entries[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
      String(options?.vars?.[name] ?? match),
    );

const STATIC_PROPS = [
  'title', 'amount', 'amountHint', 'amountInvalid', 'upload', 'uploadRequired', 'includeSlot',
  'includeSlotHint', 'viewBill', 'attendees', 'slotPrice', 'finalBill', 'noBill', 'venueTotal',
  'venueTotalWithSlot', 'sentToFinance',
] as const satisfies readonly (keyof VenueBillLabels)[];

/** Every key suffix the `venueBill` block of each bundle ships. */
const BUNDLE_KEYS = [...STATIC_PROPS, 'attendeesValue'].toSorted((a, b) => a.localeCompare(b));

/** Build with a recorder and invoke the one dynamic label once. */
const renderEverything = (build: Builder): string[] => {
  const { t, calls } = recorder();
  build(t).attendeesValue(9, 12);
  return calls.map((c) => c.key);
};

const NAMESPACES = [
  ['mweb', mwebVenueBillLabels],
  ['shell', shellVenueBillLabels],
] as const;

describe.each(NAMESPACES)('%s namespace', (namespace, build) => {
  const prefix = `${namespace}.venueBill.`;

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

  it('passes the attended and booked seats through as named vars', () => {
    const { t, calls } = recorder();
    const labels = build(t);
    calls.length = 0;
    expect(labels.attendeesValue(9, 12)).toBe(`t:${prefix}attendeesValue`);
    expect(calls).toEqual([{ key: `${prefix}attendeesValue`, vars: { attended: 9, booked: 12 } }]);
  });

  it('fills the bundle placeholders by the names the bundle uses', () => {
    const labels = build(catalogue({ [`${prefix}attendeesValue`]: '{attended} of {booked} seats' }));
    expect(labels.attendeesValue(9, 12)).toBe('9 of 12 seats');
    expect(labels.attendeesValue(0, 0)).toBe('0 of 0 seats');
    expect(labels.title).toBe(`<missing ${prefix}title>`);
  });
});

// The two namespaces are promised word-for-word identical; rendering the SAME
// key suffixes is what keeps a label added to one builder from being forgotten
// in the other.
describe('mweb and shell namespaces', () => {
  it('render the identical sequence of key suffixes', () => {
    const suffixes = (build: Builder, prefix: string) =>
      renderEverything(build).map((k) => k.slice(prefix.length));
    expect(suffixes(shellVenueBillLabels, 'shell.venueBill.')).toEqual(
      suffixes(mwebVenueBillLabels, 'mweb.venueBill.'),
    );
  });
});

describe('buildVenueBillLines', () => {
  const labels = mwebVenueBillLabels(
    catalogue({
      'mweb.venueBill.attendees': 'Total attendees',
      'mweb.venueBill.attendeesValue': '{attended} of {booked} seats',
      'mweb.venueBill.slotPrice': 'Earlier slot price',
      'mweb.venueBill.finalBill': 'Final bill uploaded',
      'mweb.venueBill.noBill': 'None',
      'mweb.venueBill.venueTotal': 'Venue total',
      'mweb.venueBill.venueTotalWithSlot': 'Venue total (slot price + bill)',
    }),
  );

  // A ₹300 slot, 9 of 12 seats attended, no bill entered: the venue is paid its slot.
  const terms: VenueBillTerms = {
    slot_price: 300,
    bill: 0,
    slot_included: false,
    venue_amount: 300,
    attended_seats: 9,
    booked_seats: 12,
  };

  it('states “None” for the bill and pays the slot price when no bill was entered', () => {
    expect(buildVenueBillLines(terms, labels, '₹')).toEqual([
      { key: 'attendees', label: 'Total attendees', value: '9 of 12 seats' },
      { key: 'slot-price', label: 'Earlier slot price', value: '₹300.00' },
      { key: 'final-bill', label: 'Final bill uploaded', value: 'None' },
      { key: 'venue-total', label: 'Venue total', value: '₹300.00', strong: true },
    ]);
  });

  it('shows a bill that replaces the slot price under the plain total label', () => {
    expect(buildVenueBillLines({ ...terms, bill: 450.5, venue_amount: 450.5 }, labels, '₹')).toEqual([
      { key: 'attendees', label: 'Total attendees', value: '9 of 12 seats' },
      { key: 'slot-price', label: 'Earlier slot price', value: '₹300.00' },
      { key: 'final-bill', label: 'Final bill uploaded', value: '₹450.50' },
      { key: 'venue-total', label: 'Venue total', value: '₹450.50', strong: true },
    ]);
  });

  it('names the total “slot price + bill” when the slot is paid on top of the bill', () => {
    const lines = buildVenueBillLines(
      { ...terms, bill: 450.5, slot_included: true, venue_amount: 750.5 },
      labels,
      '₹',
    );
    expect(lines.at(-1)).toEqual({
      key: 'venue-total',
      label: 'Venue total (slot price + bill)',
      value: '₹750.50',
      strong: true,
    });
    expect(lines.find((line) => line.key === 'final-bill')?.value).toBe('₹450.50');
  });

  it('leaves the slot-price line out when there is no slot price to state', () => {
    const lines = buildVenueBillLines(
      { ...terms, slot_price: 0, bill: 200, venue_amount: 200 },
      labels,
      '₹',
    );
    expect(lines.map((line) => line.key)).toEqual(['attendees', 'final-bill', 'venue-total']);
  });

  it('marks only the total as the strong line', () => {
    const lines = buildVenueBillLines({ ...terms, bill: 450.5, venue_amount: 450.5 }, labels, '₹');
    expect(lines.filter((line) => line.strong).map((line) => line.key)).toEqual(['venue-total']);
  });

  it('formats money with the given symbol, two decimals and no grouping', () => {
    const lines = buildVenueBillLines(
      { ...terms, slot_price: 12500, bill: 1999.999, venue_amount: 12500 },
      labels,
      '$',
    );
    expect(lines.map((line) => line.value)).toEqual([
      '9 of 12 seats',
      '$12500.00',
      '$2000.00',
      '$12500.00',
    ]);
  });
});

describe('firstMediaUrl', () => {
  it.each([[''], [null], [undefined], ['  \n\t\n ']])('is empty for %j', (text) => {
    expect(firstMediaUrl(text)).toBe('');
  });

  it('returns a single URL trimmed', () => {
    expect(firstMediaUrl('  https://ik.example/bill.pdf  ')).toBe('https://ik.example/bill.pdf');
  });

  it('skips blank lines and keeps only the first of several URLs', () => {
    expect(firstMediaUrl('\n   \nhttps://ik.example/a.jpg\r\nhttps://ik.example/b.jpg\n')).toBe(
      'https://ik.example/a.jpg',
    );
  });
});
