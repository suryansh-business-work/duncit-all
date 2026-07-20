import { describe, expect, it } from 'vitest';
import { adRequestSchema, blankAdRequestValues, toSubmitAdRequestInput } from './ad-request.types';

const DAY_MS = 24 * 60 * 60 * 1000;

const valid = {
  ...blankAdRequestValues(),
  ad_title: 'Weekend Mega Sale',
  ad_description: 'Flat discounts on every listing this weekend only.',
  media_url: 'https://ik.imagekit.io/duncit/ads/banner.png',
};

const messages = (result: ReturnType<typeof adRequestSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('adRequestSchema', () => {
  it('accepts a valid ad request', () => {
    expect(adRequestSchema.parse(valid).ad_title).toBe('Weekend Mega Sale');
  });

  it('rejects a title shorter than 3 characters', () => {
    expect(messages(adRequestSchema.safeParse({ ...valid, ad_title: 'Hi' }))).toMatch(/ad title/i);
  });

  it('rejects a description shorter than 10 characters', () => {
    expect(messages(adRequestSchema.safeParse({ ...valid, ad_description: 'Too short' }))).toMatch(/ad description/i);
  });

  it('requires the ad media upload', () => {
    expect(messages(adRequestSchema.safeParse({ ...valid, media_url: '' }))).toMatch(/upload the ad media/i);
  });

  it('rejects a start date before today', () => {
    const yesterday = new Date(Date.now() - DAY_MS).toISOString();
    expect(messages(adRequestSchema.safeParse({ ...valid, start_at: yesterday }))).toMatch(/today or later/i);
  });

  it('rejects an unparseable start date', () => {
    expect(messages(adRequestSchema.safeParse({ ...valid, start_at: 'not-a-date' }))).toMatch(/valid date/i);
  });

  it('rejects durations below 1 day and above 30 days', () => {
    expect(messages(adRequestSchema.safeParse({ ...valid, duration_days: 0 }))).toMatch(/at least 1 day/i);
    expect(messages(adRequestSchema.safeParse({ ...valid, duration_days: 31 }))).toMatch(/at most 30 days/i);
  });

  it('rejects a non-http redirect URL but accepts blank/https', () => {
    expect(messages(adRequestSchema.safeParse({ ...valid, redirect_url: 'ftp://example.com' }))).toMatch(/redirect url/i);
    expect(adRequestSchema.safeParse({ ...valid, redirect_url: '' }).success).toBe(true);
    expect(adRequestSchema.safeParse({ ...valid, redirect_url: 'https://duncit.com/offer' }).success).toBe(true);
  });

  it('rejects a redirect URL the URL constructor cannot parse (catch branch)', () => {
    expect(messages(adRequestSchema.safeParse({ ...valid, redirect_url: 'not-a-valid-url' }))).toMatch(/redirect url/i);
  });

  it('defaults a missing redirect URL to an empty string', () => {
    const withoutRedirect: Record<string, unknown> = { ...valid };
    delete withoutRedirect.redirect_url;
    expect(adRequestSchema.parse(withoutRedirect).redirect_url).toBe('');
  });
});

describe('toSubmitAdRequestInput', () => {
  it('drops empty optionals and normalises start_at to ISO', () => {
    const input = toSubmitAdRequestInput(valid);
    expect(input.redirect_url).toBeUndefined();
    expect(input.target_audience).toBeUndefined();
    expect(new Date(input.start_at).toISOString()).toBe(input.start_at);
  });

  it('keeps optionals and maps media/position/duration through', () => {
    const input = toSubmitAdRequestInput({
      ...valid,
      ad_type: 'VIDEO',
      position: 'POD_DETAILS',
      duration_days: 30,
      redirect_url: 'https://duncit.com/offer',
      target_audience: 'Young professionals in Indore',
    });
    expect(input.ad_type).toBe('VIDEO');
    expect(input.position).toBe('POD_DETAILS');
    expect(input.duration_days).toBe(30);
    expect(input.media_url).toBe(valid.media_url);
    expect(input.redirect_url).toBe('https://duncit.com/offer');
    expect(input.target_audience).toBe('Young professionals in Indore');
  });
});
