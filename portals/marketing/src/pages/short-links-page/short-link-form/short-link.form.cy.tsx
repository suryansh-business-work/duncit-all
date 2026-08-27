import { describe, expect, it } from 'vitest';
import {
  blankShortLinkValues,
  isAllowedDestination,
  shortLinkSchema,
  toShortLinkInput,
} from './short-link.form';

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
