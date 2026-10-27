import { describe, expect, it } from 'vitest';
import {
  EARN_LIMITS,
  earnSchema,
  isHttpsUrl,
  toEarnInput,
  toEarnValues,
  type WebsiteEarnSection,
} from '../../src/pages/website/earn/earn-form/earn.types';
import { en } from '../en';

const t = (key: string, options?: { vars: Record<string, number> }) => en(key, options?.vars);

const section: WebsiteEarnSection = {
  site: 'MAIN',
  enabled: true,
  position: 'AFTER_REELS',
  variant: 'WALL',
  accent: 'PRIMARY',
  eyebrow: 'Earn',
  heading: 'Earn with',
  heading_muted: 'Duncit',
  text: 'Host pods and earn.',
  cta_label: 'Start',
  cta_url: 'https://earnwith.duncit.com',
  images: ['https://ik.test/a.jpg'],
  floating_enabled: true,
  floating_label: 'Earn',
  updated_at: '2026-10-01T10:00:00.000Z',
};

const schema = earnSchema(t);
const { updated_at: _updatedAt, site: _site, ...values } = section;
const issues = (over: Record<string, unknown>) => {
  const result = schema.safeParse({ ...values, ...over });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('isHttpsUrl', () => {
  it('accepts only https addresses', () => {
    expect(isHttpsUrl('https://duncit.com/a?b=1')).toBe(true);
    expect(isHttpsUrl('http://duncit.com')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('not a url')).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
  });
});

describe('earnSchema', () => {
  it('accepts a complete section', () => {
    expect(schema.safeParse(values).success).toBe(true);
  });

  it('accepts a section with every piece of copy blank, to keep the default text', () => {
    expect(
      issues({ eyebrow: '', heading: '', heading_muted: '', text: '', cta_label: '', cta_url: '', images: [], floating_label: '' }),
    ).toEqual([]);
  });

  it('trims copy before measuring it', () => {
    const parsed = schema.parse({ ...values, heading: `  ${'a'.repeat(EARN_LIMITS.heading)}  ` });
    expect(parsed.heading).toBe('a'.repeat(EARN_LIMITS.heading));
  });

  it('refuses copy past each cap, naming the cap', () => {
    expect(issues({ eyebrow: 'a'.repeat(EARN_LIMITS.eyebrow + 1) })).toEqual([`eyebrow: ${en('websiteApp.earn.errMax', { max: 40 })}`]);
    expect(issues({ text: 'a'.repeat(EARN_LIMITS.text + 1) })).toEqual([`text: ${en('websiteApp.earn.errMax', { max: 240 })}`]);
    expect(issues({ floating_label: 'a'.repeat(EARN_LIMITS.floating_label + 1) })).toEqual([
      `floating_label: ${en('websiteApp.earn.errMax', { max: 40 })}`,
    ]);
  });

  it('refuses a button link that is not https, and allows it blank', () => {
    expect(issues({ cta_url: 'http://duncit.com' })).toEqual([`cta_url: ${en('websiteApp.earn.errHttps')}`]);
    expect(issues({ cta_url: '' })).toEqual([]);
  });

  it('refuses a photo that is not an https link, naming its position', () => {
    expect(issues({ images: ['https://ik.test/a.jpg', 'ftp://ik.test/b.jpg'] })).toEqual([`images.1: ${en('websiteApp.earn.errHttps')}`]);
  });

  it('refuses more photos than the cap', () => {
    const many = Array.from({ length: EARN_LIMITS.images + 1 }, (_unused, index) => `https://ik.test/${index}.jpg`);
    expect(issues({ images: many })).toEqual([`images: ${en('websiteApp.earn.errImagesMax', { max: 13 })}`]);
  });

  it('refuses a position, layout or accent the server does not know', () => {
    expect(issues({ position: 'TOP' })).toHaveLength(1);
    expect(issues({ variant: 'GRID' })).toHaveLength(1);
    expect(issues({ accent: 'PINK' })).toHaveLength(1);
  });
});

describe('earn value mapping', () => {
  it('fills the form from a stored section, leaving out the site and the save time', () => {
    expect(toEarnValues(section)).toEqual(values);
    expect(toEarnValues(section)).not.toHaveProperty('updated_at');
    expect(toEarnValues(section)).not.toHaveProperty('site');
  });

  it('sends the form back for the site being edited', () => {
    expect(toEarnInput(schema.parse(values), 'ADS')).toEqual({ site: 'ADS', ...values });
  });
});
