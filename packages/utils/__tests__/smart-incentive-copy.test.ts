import { describe, expect, it } from 'vitest';
import type { SmartIncentivePctIssue } from '../src/smart-incentive';
import {
  mwebSmartIncentiveLabels,
  shellSmartIncentiveLabels,
  type SmartIncentiveLabels,
  type SmartIncentiveTranslate,
} from '../src/smart-incentive-copy';

type Builder = (t: SmartIncentiveTranslate) => SmartIncentiveLabels;
type Vars = Record<string, string | number> | undefined;

/**
 * A translator that records every call and answers `t:<key>` — never the bare
 * key — so a test can tell "came out of the translator" from "the key string
 * hard-coded in the package".
 */
const recorder = () => {
  const calls: { key: string; vars: Vars }[] = [];
  const t: SmartIncentiveTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

/** A translator over a tiny catalogue, substituting `{name}` placeholders the way `@duncit/i18n` does. */
const catalogue =
  (entries: Record<string, string>): SmartIncentiveTranslate =>
  (key, options) =>
    (entries[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
      String(options?.vars?.[name] ?? match),
    );

const STATIC_PROPS = ['title', 'switchLabel', 'hint', 'pctLabel', 'learnMore'] as const;
const STATIC_INFO = [
  ['title', 'infoTitle'],
  ['who', 'infoWho'],
  ['cut', 'infoCut'],
  ['change', 'infoChange'],
  ['gotIt', 'gotIt'],
] as const;

/** Each issue code, the bundle key suffix it renders and the vars it passes. */
const ERRORS: readonly [SmartIncentivePctIssue, string, Vars][] = [
  ['REQUIRED', 'errorRequired', undefined],
  ['PCT_MIN', 'errorPctMin', undefined],
  ['PCT_MAX', 'errorPctMax', { max: 25 }],
];

/** Every editor key suffix each bundle ships for the host's editor and explainer. */
const EDITOR_KEYS = [
  ...STATIC_PROPS,
  ...STATIC_INFO.map(([, suffix]) => suffix),
  'maxHint',
  'pricePreview',
  'infoWhat',
  ...ERRORS.map(([, suffix]) => suffix),
].toSorted((a, b) => a.localeCompare(b));

/** Build with a recorder and invoke every dynamic label once. */
const renderEverything = (build: Builder): string[] => {
  const { t, calls } = recorder();
  const labels = build(t);
  labels.maxHint(20);
  labels.pricePreview('₹450');
  labels.info.what(15);
  for (const [code] of ERRORS) labels.errors[code](25);
  return calls.map((c) => c.key);
};

const NAMESPACES = [
  ['mweb', mwebSmartIncentiveLabels],
  ['shell', shellSmartIncentiveLabels],
] as const;

describe.each(NAMESPACES)('%s namespace', (namespace, build) => {
  const prefix = `${namespace}.smartIncentive.`;

  it('asks for every editor key under its own prefix, each exactly once', () => {
    const keys = renderEverything(build);
    expect(keys.every((k) => k.startsWith(prefix))).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.map((k) => k.slice(prefix.length)).toSorted((a, b) => a.localeCompare(b))).toEqual(EDITOR_KEYS);
  });

  it('resolves every static label through the translator with no vars', () => {
    const { t, calls } = recorder();
    const labels = build(t);
    for (const prop of STATIC_PROPS) expect(labels[prop]).toBe(`t:${prefix}${prop}`);
    for (const [prop, suffix] of STATIC_INFO) expect(labels.info[prop]).toBe(`t:${prefix}${suffix}`);
    expect(calls.every((c) => c.vars === undefined)).toBe(true);
    expect(calls).toHaveLength(STATIC_PROPS.length + STATIC_INFO.length);
  });

  it('passes the maximum, the price and the delay through as named vars', () => {
    const { t, calls } = recorder();
    const labels = build(t);
    calls.length = 0;
    expect(labels.maxHint(30)).toBe(`t:${prefix}maxHint`);
    expect(labels.pricePreview('₹399.20')).toBe(`t:${prefix}pricePreview`);
    expect(labels.info.what(45)).toBe(`t:${prefix}infoWhat`);
    expect(calls).toEqual([
      { key: `${prefix}maxHint`, vars: { max: 30 } },
      { key: `${prefix}pricePreview`, vars: { price: '₹399.20' } },
      { key: `${prefix}infoWhat`, vars: { seconds: 45 } },
    ]);
  });

  it.each(ERRORS)('words %s with its own key and quotes the maximum only where it is needed', (code, suffix, vars) => {
    const { t, calls } = recorder();
    const labels = build(t);
    calls.length = 0;
    expect(labels.errors[code](25)).toBe(`t:${prefix}${suffix}`);
    expect(calls).toEqual([{ key: `${prefix}${suffix}`, vars }]);
  });

  it('fills the bundle placeholders by the names the bundle uses', () => {
    const labels = build(
      catalogue({
        [`${prefix}maxHint`]: 'Up to {max}% off',
        [`${prefix}pricePreview`]: 'With the offer, a ticket costs {price}',
        [`${prefix}infoWhat`]: 'After {seconds} seconds on your pod page',
        [`${prefix}errorPctMax`]: 'Discount can’t be more than {max}%',
      }),
    );
    expect(labels.maxHint(20)).toBe('Up to 20% off');
    expect(labels.pricePreview('₹450')).toBe('With the offer, a ticket costs ₹450');
    expect(labels.info.what(15)).toBe('After 15 seconds on your pod page');
    expect(labels.errors.PCT_MAX(20)).toBe('Discount can’t be more than 20%');
  });
});

describe('the two namespaces', () => {
  it('render the same key suffixes, so a portal and the apps can never drift apart', () => {
    const strip = (keys: string[], prefix: string) => keys.map((k) => k.slice(prefix.length));
    expect(strip(renderEverything(mwebSmartIncentiveLabels), 'mweb.smartIncentive.')).toEqual(
      strip(renderEverything(shellSmartIncentiveLabels), 'shell.smartIncentive.'),
    );
  });
});
