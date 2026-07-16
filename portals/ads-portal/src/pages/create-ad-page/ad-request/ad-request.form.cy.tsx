import { describe, expect, it } from 'vitest';
import {
  adRequestSchema,
  blankAdRequestValues,
  toSubmitAdRequestInput,
} from './ad-request.form';

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
    const parsed = adRequestSchema.parse(valid);
    expect(parsed.ad_title).toBe('Weekend Mega Sale');
  });

  it('rejects a title shorter than 3 characters', () => {
    const result = adRequestSchema.safeParse({ ...valid, ad_title: 'Hi' });
    expect(messages(result)).toMatch(/ad title/i);
  });

  it('rejects a description shorter than 10 characters', () => {
    const result = adRequestSchema.safeParse({ ...valid, ad_description: 'Too short' });
    expect(messages(result)).toMatch(/ad description/i);
  });

  it('requires the ad media upload', () => {
    const result = adRequestSchema.safeParse({ ...valid, media_url: '' });
    expect(messages(result)).toMatch(/upload the ad media/i);
  });

  it('rejects a start date before today', () => {
    const yesterday = new Date(Date.now() - DAY_MS).toISOString();
    const result = adRequestSchema.safeParse({ ...valid, start_at: yesterday });
    expect(messages(result)).toMatch(/today or later/i);
  });

  it('accepts a start date later this month', () => {
    const nextWeek = new Date(Date.now() + 7 * DAY_MS).toISOString();
    const result = adRequestSchema.safeParse({ ...valid, start_at: nextWeek });
    expect(result.success).toBe(true);
  });

  it('rejects an unparseable start date', () => {
    const result = adRequestSchema.safeParse({ ...valid, start_at: 'not-a-date' });
    expect(messages(result)).toMatch(/valid date/i);
  });

  it('rejects a duration below 1 day', () => {
    const result = adRequestSchema.safeParse({ ...valid, duration_days: 0 });
    expect(messages(result)).toMatch(/at least 1 day/i);
  });

  it('rejects a duration above 30 days', () => {
    const result = adRequestSchema.safeParse({ ...valid, duration_days: 31 });
    expect(messages(result)).toMatch(/at most 30 days/i);
  });

  it('rejects a non-http redirect URL', () => {
    const result = adRequestSchema.safeParse({ ...valid, redirect_url: 'ftp://example.com' });
    expect(messages(result)).toMatch(/redirect url/i);
  });

  it('accepts a blank redirect URL and an https one', () => {
    expect(adRequestSchema.safeParse({ ...valid, redirect_url: '' }).success).toBe(true);
    expect(
      adRequestSchema.safeParse({ ...valid, redirect_url: 'https://duncit.com/offer' }).success,
    ).toBe(true);
  });

  it('accepts VIDEO as the ad type', () => {
    const result = adRequestSchema.safeParse({ ...valid, ad_type: 'VIDEO' as const });
    expect(result.success).toBe(true);
  });
});

describe('toSubmitAdRequestInput', () => {
  it('drops empty optional fields', () => {
    const input = toSubmitAdRequestInput(valid);
    expect(input.redirect_url).toBeUndefined();
    expect(input.target_audience).toBeUndefined();
  });

  it('keeps optional fields when set and normalises start_at to ISO', () => {
    const input = toSubmitAdRequestInput({
      ...valid,
      redirect_url: 'https://duncit.com/offer',
      target_audience: 'Young professionals in Indore',
    });
    expect(input.redirect_url).toBe('https://duncit.com/offer');
    expect(input.target_audience).toBe('Young professionals in Indore');
    expect(new Date(input.start_at).toISOString()).toBe(input.start_at);
  });

  it('maps the selected media, position and duration through unchanged', () => {
    const input = toSubmitAdRequestInput({
      ...valid,
      ad_type: 'VIDEO',
      position: 'POD_DETAILS',
      duration_days: 30,
    });
    expect(input.ad_type).toBe('VIDEO');
    expect(input.position).toBe('POD_DETAILS');
    expect(input.duration_days).toBe(30);
    expect(input.media_url).toBe(valid.media_url);
  });
});
