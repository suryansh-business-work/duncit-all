import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '@duncit/app-settings';
import {
  BANNER_STYLES,
  BANNER_STYLE_LABEL,
  HOURS,
  PRICE_FILTERS,
  PRICE_FILTER_LABEL,
  PROMO_SOURCES,
  PROMO_SOURCE_LABEL,
  PROMO_STATUSES,
  PROMO_STATUS_COLOR,
  PROMO_STATUS_LABEL,
  isOpenPromo,
} from '../../src/pages/pod-promos-page/copy';
import { canManagePodPromos } from '../../src/pages/pod-promos-page/roles';
import { funnelSteps } from '../../src/pages/pod-promos-page/promos/PromoFigures';
import { toSettingsOptions } from '../../src/pages/pod-promos-page/settings/useSettingsOptions';
import { makePodPromoFigures } from '../mocks';

const translator = () => renderHook(() => useTranslation()).result.current.t;

describe('pod promotion copy', () => {
  it('labels and colours every status, source, price filter and banner shape the server sends', () => {
    const t = translator();
    expect(PROMO_STATUSES.map((status) => t(PROMO_STATUS_LABEL[status]))).toEqual([
      'Planned',
      'Banner ready',
      'Scheduled',
      'Published',
      'Skipped',
      'Failed',
      'Cancelled',
    ]);
    expect(PROMO_STATUS_COLOR.FAILED).toBe('error');
    expect(PROMO_STATUS_COLOR.PUBLISHED).toBe('success');
    expect(PROMO_SOURCES.map((source) => t(PROMO_SOURCE_LABEL[source]))).toEqual(['Planner', 'By hand']);
    expect(PRICE_FILTERS.map((price) => t(PRICE_FILTER_LABEL[price]))).toEqual(['All pods', 'Paid pods only', 'Free pods only']);
    expect(BANNER_STYLES.map((style) => t(BANNER_STYLE_LABEL[style]))).toEqual(['Portrait (1080 × 1350)', 'Square (1080 × 1080)']);
  });

  it('offers all 24 hours, midnight first', () => {
    expect(HOURS).toHaveLength(24);
    expect(HOURS[0]).toBe(0);
    expect(HOURS.at(-1)).toBe(23);
  });

  it('treats only a promotion whose post has not gone out as open', () => {
    expect(PROMO_STATUSES.filter(isOpenPromo)).toEqual(['PLANNED', 'BANNER_READY', 'SCHEDULED']);
  });
});

describe('canManagePodPromos', () => {
  it('lets a super admin or a marketing manager act, and nobody else', () => {
    expect(canManagePodPromos(['SUPER_ADMIN'])).toBe(true);
    expect(canManagePodPromos(['MARKETING_EDITOR', 'MARKETING_MANAGER'])).toBe(true);
    expect(canManagePodPromos(['MARKETING_EDITOR', 'MARKETING_READER', 'CITY_ADMIN'])).toBe(false);
    expect(canManagePodPromos([])).toBe(false);
    expect(canManagePodPromos(null)).toBe(false);
    expect(canManagePodPromos(undefined)).toBe(false);
  });
});

describe('funnelSteps', () => {
  it('walks click to payment in order with the figures behind each step', () => {
    const steps = funnelSteps(makePodPromoFigures({ clicks: 10, signups: 4, bookings: 3, payments: 2 }), translator());
    expect(steps.map((step) => [step.key, step.label, step.value])).toEqual([
      ['clicks', 'Clicked', 10],
      ['signups', 'Signed up', 4],
      ['bookings', 'Booked this pod', 3],
      ['payments', 'Paid', 2],
    ]);
  });
});

describe('toSettingsOptions', () => {
  it('names each account with its network and sorts every list by name', () => {
    const options = toSettingsOptions({
      socialAccounts: [
        { id: 'b', name: 'Zed', platform: 'X' },
        { id: 'a', name: 'Alpha', platform: 'INSTAGRAM' },
      ],
      locations: [
        { id: 'l2', location_name: 'Pune' },
        { id: 'l1', location_name: 'Mumbai' },
      ],
      clubs: [{ id: 'c1', club_name: 'Runners' }],
      categories: [{ id: 'k1', name: 'Fitness' }],
    });
    expect(options.accounts).toEqual([
      { id: 'a', label: 'Alpha (INSTAGRAM)' },
      { id: 'b', label: 'Zed (X)' },
    ]);
    expect(options.cities.map((city) => city.label)).toEqual(['Mumbai', 'Pune']);
    expect(options.clubs).toEqual([{ id: 'c1', label: 'Runners' }]);
    expect(options.categories).toEqual([{ id: 'k1', label: 'Fitness' }]);
  });

  it('gives empty lists before the options arrive', () => {
    expect(toSettingsOptions(undefined)).toEqual({ accounts: [], cities: [], clubs: [], categories: [] });
  });
});
