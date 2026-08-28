import { describe, expect, it } from 'vitest';
import {
  buildPodMediaLabels,
  mwebPodMediaLabels,
  shellPodMediaLabels,
  type PodMediaLabels,
  type PodMediaTranslate,
} from '../src/pod-media-copy';

type Builder = (t: PodMediaTranslate) => PodMediaLabels;
type Vars = Record<string, string | number> | undefined;

/**
 * A translator that records every call and answers with a marker built from the
 * key, so a test can tell "came out of the translator" from "the key string
 * hard-coded in the package".
 */
const recorder = () => {
  const calls: { key: string; vars: Vars }[] = [];
  const t: PodMediaTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return `t:${key}`;
  };
  return { t, calls };
};

/** A translator over a tiny catalogue, filling `{name}` the way @duncit/i18n does. */
const catalogue =
  (entries: Record<string, string>): PodMediaTranslate =>
  (key, options) =>
    (entries[key] ?? `<missing ${key}>`).replaceAll(/\{(\w+)\}/g, (match, name: string) =>
      String(options?.vars?.[name] ?? match),
    );

/** Label props that are plain strings, resolved once when the bundle is built. */
const STATIC_PROPS = [
  'pageTitle', 'back', 'hostIntro', 'guestIntro', 'addMedia', 'uploading', 'empty',
  'byHost', 'byGuest', 'remove', 'removed', 'notInvited', 'cancelled', 'shareLink',
  'copyLink', 'linkCopied', 'shareHeading', 'shareBody', 'retry', 'loadFailed',
] as const satisfies readonly (keyof PodMediaLabels)[];

/** The key each static prop reads, where the two differ from the prop name. */
const KEY_FOR: Partial<Record<(typeof STATIC_PROPS)[number], string>> = {
  pageTitle: 'uploadPodMedia',
};

/**
 * Every key either namespace renders. A rename in the source that is not
 * mirrored in both `@duncit/i18n` bundles ships a key with no copy behind it.
 */
const BUNDLE_KEYS = [
  ...STATIC_PROPS.map((prop) => KEY_FOR[prop] ?? prop),
  'itemsHeading',
  'uploadedBy',
  'added',
  'shareMessage',
].toSorted((a, b) => a.localeCompare(b));

describe.each<[string, Builder, string]>([
  ['mweb namespace', mwebPodMediaLabels, 'mweb.podMedia.'],
  ['shell namespace', shellPodMediaLabels, 'shell.podMedia.'],
])('%s', (_name, build, prefix) => {
  it('renders exactly the keys the bundle ships, each one once', () => {
    const { t, calls } = recorder();
    const labels = build(t);
    labels.itemsHeading(3);
    labels.uploadedBy('Asha');
    labels.added(2);
    labels.shareMessage('Sunday morning run');
    const keys = calls.map((call) => call.key);

    expect(keys.every((key) => key.startsWith(prefix))).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.map((key) => key.slice(prefix.length)).toSorted((a, b) => a.localeCompare(b))).toEqual(
      BUNDLE_KEYS,
    );
  });

  it('resolves every static label through the translator, with no vars', () => {
    const { t, calls } = recorder();
    const labels = build(t);

    for (const prop of STATIC_PROPS) {
      expect(labels[prop]).toBe(`t:${prefix}${KEY_FOR[prop] ?? prop}`);
    }
    expect(calls.every((call) => call.vars === undefined)).toBe(true);
    expect(calls).toHaveLength(STATIC_PROPS.length);
  });

  it('returns the translated sentence verbatim, not the key', () => {
    const labels = build(catalogue({ [`${prefix}addMedia`]: 'Add photos or videos' }));

    expect(labels.addMedia).toBe('Add photos or videos');
    expect(labels.pageTitle).toBe(`<missing ${prefix}uploadPodMedia>`);
  });

  it.each<[string, (l: PodMediaLabels) => string, string, Vars]>([
    ['itemsHeading', (l) => l.itemsHeading(4), 'itemsHeading', { count: 4 }],
    ['uploadedBy', (l) => l.uploadedBy('Asha'), 'uploadedBy', { name: 'Asha' }],
    ['added', (l) => l.added(2), 'added', { count: 2 }],
    ['shareMessage', (l) => l.shareMessage('Sunday run'), 'shareMessage', { title: 'Sunday run' }],
  ])('%s passes its arguments through as named vars', (_label, invoke, suffix, vars) => {
    const { t, calls } = recorder();
    const labels = build(t);
    calls.length = 0;

    expect(invoke(labels)).toBe(`t:${prefix}${suffix}`);
    expect(calls).toEqual([{ key: `${prefix}${suffix}`, vars }]);
  });

  // The var names must match the bundle placeholders, or the sentence renders
  // with the brace still in it.
  it('fills the bundle placeholders by the names the bundle uses', () => {
    const labels = build(
      catalogue({
        [`${prefix}itemsHeading`]: '{count} items',
        [`${prefix}uploadedBy`]: 'Uploaded by {name}',
        [`${prefix}added`]: 'Added {count}',
        [`${prefix}shareMessage`]: 'Photos from {title}',
      }),
    );

    expect(labels.itemsHeading(4)).toBe('4 items');
    expect(labels.uploadedBy('Asha')).toBe('Uploaded by Asha');
    expect(labels.added(2)).toBe('Added 2');
    expect(labels.shareMessage('Sunday run')).toBe('Photos from Sunday run');
  });
});

describe('buildPodMediaLabels', () => {
  it('picks the namespace the calling surface ships', () => {
    const { t } = recorder();

    expect(buildPodMediaLabels(t, 'mweb').pageTitle).toBe('t:mweb.podMedia.uploadPodMedia');
    expect(buildPodMediaLabels(t, 'shell').pageTitle).toBe('t:shell.podMedia.uploadPodMedia');
  });

  it('builds the same shape either way, so a surface cannot be missing a label', () => {
    const { t } = recorder();

    expect(Object.keys(buildPodMediaLabels(t, 'mweb')).toSorted((a, b) => a.localeCompare(b))).toEqual(
      Object.keys(buildPodMediaLabels(t, 'shell')).toSorted((a, b) => a.localeCompare(b)),
    );
  });
});
