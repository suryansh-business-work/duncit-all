import { describe, expect, it } from 'vitest';
import {
  blankShortLinkValues,
  isAllowedDestination,
  shortLinkSchema,
  shortLinkValuesFrom,
  toShortLinkInput,
  toShortLinkUpdateInput,
} from './short-link.form';
import type { ShortLinkRow } from '../queries';

const valid = {
  ...blankShortLinkValues(),
  label: 'Diwali pod push',
  destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
  source: 'INSTAGRAM',
  medium: 'SOCIAL',
};

// The schema is built per-render from the surface's translator, so every call
// site asks for one rather than importing a ready-made object.
const schema = shortLinkSchema();

const messages = (result: ReturnType<typeof schema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('isAllowedDestination', () => {
  // duncit.com/<code> carries our brand, so it may not be pointed elsewhere.
  it('accepts our own sites and the app stores', () => {
    expect(isAllowedDestination('https://mweb.duncit.com/shop')).toBe(true);
    expect(isAllowedDestination('https://duncit.com/about')).toBe(true);
    expect(isAllowedDestination('https://play.google.com/store/apps/details?id=x')).toBe(true);
    expect(isAllowedDestination('https://apps.apple.com/app/id1')).toBe(true);
  });

  it('rejects anything else, and anything that is not an http url', () => {
    expect(isAllowedDestination('https://evil.example/free')).toBe(false);
    // A lookalike host must not slip through an endsWith check.
    expect(isAllowedDestination('https://notduncit.com/x')).toBe(false);
    expect(isAllowedDestination('javascript:alert(1)')).toBe(false);
    expect(isAllowedDestination('mweb.duncit.com/shop')).toBe(false);
    expect(isAllowedDestination('')).toBe(false);
  });
});

describe('shortLinkSchema', () => {
  it('accepts a fully filled link', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('requires a label with something in it', () => {
    expect(messages(schema.safeParse({ ...valid, label: 'ab' }))).toMatch(/at least 3/i);
  });

  it('explains an unusable destination', () => {
    expect(messages(schema.safeParse({ ...valid, destination_url: 'evil.example' }))).toMatch(
      /Duncit site or an app store/i,
    );
    expect(messages(schema.safeParse({ ...valid, destination_url: '' }))).toMatch(
      /required/i,
    );
  });

  it('needs a channel and a medium chosen', () => {
    expect(messages(schema.safeParse({ ...valid, source: '' }))).toMatch(/where this link/i);
    expect(messages(schema.safeParse({ ...valid, medium: '' }))).toMatch(/Pick a medium/i);
  });

  // An untagged link silently loses the attribution it was created for.
  it('makes Other say what it means', () => {
    expect(messages(schema.safeParse({ ...valid, source: 'OTHER' }))).toMatch(
      /what the channel is/i,
    );
    expect(messages(schema.safeParse({ ...valid, medium: 'OTHER' }))).toMatch(
      /what the medium is/i,
    );
    expect(
      schema.safeParse({
        ...valid,
        source: 'OTHER',
        source_other: 'Campus Ambassador',
        medium: 'OTHER',
        medium_other: 'Print Flyer',
      }).success,
    ).toBe(true);
  });
});

describe('toShortLinkInput', () => {
  it('sends only what the server needs', () => {
    const input = toShortLinkInput(valid);
    expect(input).toEqual({
      label: 'Diwali pod push',
      destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
      source: 'INSTAGRAM',
      source_other: undefined,
      medium: 'SOCIAL',
      medium_other: undefined,
      campaign_id: undefined,
      meta_override_enabled: false,
      meta_title: '',
      meta_description: '',
      meta_image_url: '',
    });
  });

  it('carries the free text only for Other', () => {
    const other = toShortLinkInput({
      ...valid,
      source: 'OTHER',
      source_other: 'Campus Ambassador',
      medium: 'OTHER',
      medium_other: 'Print Flyer',
    });
    expect(other.source_other).toBe('Campus Ambassador');
    expect(other.medium_other).toBe('Print Flyer');

    // Text left behind after switching away from Other must not be sent.
    const switched = toShortLinkInput({ ...valid, source_other: 'stale', medium_other: 'stale' });
    expect(switched.source_other).toBeUndefined();
    expect(switched.medium_other).toBeUndefined();
  });

  it('passes a chosen campaign and omits an unchosen one', () => {
    expect(toShortLinkInput({ ...valid, campaign_id: 'camp-1' }).campaign_id).toBe('camp-1');
    expect(toShortLinkInput(valid).campaign_id).toBeUndefined();
  });
});

describe('the link-preview override', () => {
  const issuePaths = (values: typeof valid) => {
    const result = schema.safeParse(values);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
  };

  it('ignores the override fields while it is switched off', () => {
    expect(issuePaths({ ...valid, meta_title: 'x'.repeat(500), meta_image_url: 'not a url' })).toEqual([]);
  });

  it('needs a title once it is on, and holds the server limits', () => {
    const on = { ...valid, meta_override_enabled: true };
    expect(issuePaths(on)).toEqual(['meta_title']);
    expect(issuePaths({ ...on, meta_title: 'x'.repeat(121) })).toEqual(['meta_title']);
    expect(issuePaths({ ...on, meta_title: 'Diwali run', meta_description: 'x'.repeat(301) })).toEqual([
      'meta_description',
    ]);
    expect(issuePaths({ ...on, meta_title: 'Diwali run', meta_image_url: 'http://cdn.example.org/a.png' })).toEqual([
      'meta_image_url',
    ]);
    expect(
      issuePaths({ ...on, meta_title: 'Diwali run', meta_image_url: 'https://ik.imagekit.io/duncit/a.png' }),
    ).toEqual([]);
  });
});

describe('editing a link', () => {
  const row: ShortLinkRow = {
    id: 'l1',
    code: 'aB3xY9Zq',
    short_url: 'https://duncit.com/aB3xY9Zq',
    label: 'Diwali pod push',
    destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
    is_external: false,
    share_target: null,
    meta_override_enabled: true,
    meta_title: 'Diwali night run',
    meta_description: null,
    meta_image_url: null,
    tagged_url: 'https://mweb.duncit.com/club/c1/pod/p1?dl=aB3xY9Zq',
    source: 'INSTAGRAM',
    medium: 'SOCIAL',
    utm_source: 'instagram',
    utm_medium: 'social',
    is_active: true,
    click_count: 4,
    created_at: '2026-10-01T10:00:00.000Z',
  };

  it('starts the form from the link, blanks for what was never set', () => {
    const values = shortLinkValuesFrom(row);
    expect(values).toMatchObject({ meta_override_enabled: true, meta_title: 'Diwali night run', meta_description: '' });
    expect(schema.safeParse(values).success).toBe(true);
  });

  it('sends the name, destination and card — never the utm tags', () => {
    expect(toShortLinkUpdateInput(shortLinkValuesFrom(row))).toEqual({
      label: 'Diwali pod push',
      destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
      meta_override_enabled: true,
      meta_title: 'Diwali night run',
      meta_description: '',
      meta_image_url: '',
    });
  });
});
