import type { AdRequestDetail, AdRequestRow } from '../../src/pages/ads/queries';

/** A fully-populated ad request detail for the detail-page card tests. */
export const adDetail = (overrides: Partial<AdRequestDetail> = {}): AdRequestDetail => ({
  id: 'ad1',
  trace_id: 'AD-1001',
  ad_title: 'Weekend Mega Sale',
  ad_type: 'IMAGE',
  position: 'HOME_BOTTOM',
  start_at: '2026-08-01T00:00:00.000Z',
  duration_days: 7,
  estimated_cost: 3500,
  currency_symbol: '₹',
  status: 'PENDING',
  created_at: '2026-07-10T09:30:00.000Z',
  ad_description: 'Flat discounts across every listing this weekend only.',
  media_url: 'https://ik.imagekit.io/duncit/ads/banner.png',
  end_at: '2026-08-08T00:00:00.000Z',
  redirect_url: 'https://duncit.com/offer',
  target_audience: 'Young professionals in Indore',
  marketing_remarks: 'Looks good — approved at the quoted rate.',
  approved_cost: 3500,
  submitted_by_name: 'Asha Advertiser',
  reviewed_at: '2026-07-11T10:00:00.000Z',
  updated_at: '2026-07-11T10:00:00.000Z',
  ...overrides,
});

/** A My Ads table row fixture. */
export const adRow = (overrides: Partial<AdRequestRow> = {}): AdRequestRow => ({
  id: 'ad1',
  trace_id: 'AD-1001',
  ad_title: 'Weekend Mega Sale',
  ad_type: 'IMAGE',
  position: 'HOME_BOTTOM',
  start_at: '2026-08-01T00:00:00.000Z',
  duration_days: 7,
  estimated_cost: 3500,
  currency_symbol: '₹',
  status: 'LIVE',
  created_at: '2026-07-10T09:30:00.000Z',
  ...overrides,
});
