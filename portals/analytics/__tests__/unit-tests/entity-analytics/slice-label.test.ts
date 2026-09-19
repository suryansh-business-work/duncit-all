import { describe, expect, it, vi } from 'vitest';
import { createTranslator } from '@duncit/app-settings';
import { sliceLabel, type SliceLabelContext } from '../../../src/pages/entity-analytics/slice-label';
import { NONE_KEY, SLICE_COPY } from '../../../src/pages/entity-analytics/slice-copy';
import { COPY } from '../../mocks/analytics';

const { t } = createTranslator({ locale: 'en-IN', fallback: COPY });

const context = (over: Partial<SliceLabelContext> = {}): SliceLabelContext => ({
  t,
  formatClock: (value) => `clock ${value}`,
  locale: 'en-IN',
  ...over,
});

const slice = (key: string, label: string | null = null) => ({ key, label, value: 3 });

describe('sliceLabel', () => {
  it('prefers the name the data carries — a city, a category, a screen', () => {
    expect(sliceLabel('pods_by_city', slice('loc-blr', 'Bengaluru'), context())).toBe('Bengaluru');
  });

  it('calls an unset value "not set"', () => {
    expect(sliceLabel('users_by_city', slice('none'), context())).toBe(COPY[NONE_KEY]);
  });

  it('writes an hour in the admin’s clock format, padded to HH:00', () => {
    const formatClock = vi.fn((value: string) => `clock ${value}`);
    expect(sliceLabel('hour_of_day', slice('9'), context({ formatClock }))).toBe('clock 09:00');
    expect(formatClock).toHaveBeenCalledWith('09:00');
  });

  it('names a language in the reader’s own language', () => {
    expect(sliceLabel('user_language', slice('hi-IN'), context())).toBe('Hindi (India)');
  });

  it('keeps the stored code when it is not a language tag at all', () => {
    expect(sliceLabel('user_language', slice('x'), context())).toBe('x');
  });

  it('reads the same key differently per breakdown', () => {
    // DRAFT is the review queue for a club admin, but an unfinished form for a host.
    expect(sliceLabel('admin_status', slice('DRAFT'), context())).toBe(COPY['analytics.slice.awaitingReview']);
    expect(sliceLabel('host_status', slice('DRAFT'), context())).toBe(COPY['analytics.slice.draft']);
    expect(sliceLabel('weekday', slice('mon'), context())).toBe(COPY['analytics.slice.mon']);
  });

  it('falls back to the raw key when the console has no words for it', () => {
    expect(sliceLabel('weekday', slice('someday'), context())).toBe('someday');
    expect(sliceLabel('brand_new_breakdown', slice('alpha'), context())).toBe('alpha');
  });
});

describe('SLICE_COPY', () => {
  it('points every slice at a key the console actually ships', () => {
    const keys = Object.values(SLICE_COPY).flatMap((byKey) => Object.values(byKey ?? {}));
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key) => !key || !COPY[key])).toEqual([]);
    expect(COPY[NONE_KEY]).toBeTruthy();
  });
});
