import type { MockedResponse } from '@apollo/client/testing';
import {
  CAMPAIGNS_FOR_SHORT_LINK,
  SHORT_LINK,
  SHORT_LINK_FUNNEL,
  SHORT_LINK_STATS,
  CREATE_SHORT_LINK,
  DELETE_SHORT_LINK,
  SET_SHORT_LINK_ACTIVE,
  SHORT_LINK_OPTIONS,
  SHORT_LINK_QR,
  type ShortLinkClickRow,
  type ShortLinkFunnel,
  type ShortLinkJourneyRow,
  type ShortLinkOptions,
  type ShortLinkRow,
  type ShortLinkStats,
} from '../../src/pages/short-links-page/queries';

export const makeShortLinkRow = (over: Partial<ShortLinkRow> = {}): ShortLinkRow => ({
  id: 'sl1',
  code: 'aB3xY9Zq',
  short_url: 'https://duncit.com/aB3xY9Zq',
  label: 'Diwali pod push',
  destination_url: 'https://mweb.duncit.com/club/c1/pod/p1',
  tagged_url:
    'https://mweb.duncit.com/club/c1/pod/p1?utm_source=instagram&utm_medium=social&dl=aB3xY9Zq',
  source: 'INSTAGRAM',
  source_other: null,
  medium: 'SOCIAL',
  medium_other: null,
  campaign_id: null,
  utm_source: 'instagram',
  utm_medium: 'social',
  utm_campaign: null,
  is_active: true,
  click_count: 0,
  first_clicked_at: null,
  last_clicked_at: null,
  created_at: '2026-07-31T00:00:00.000Z',
  ...over,
});

const OPTIONS: ShortLinkOptions = {
  sources: [
    { value: 'INSTAGRAM', label: 'Instagram', utm_value: 'instagram', requires_text: false },
    { value: 'QR_CODE', label: 'QR Code', utm_value: 'qr_code', requires_text: false },
    { value: 'OTHER', label: 'Other', utm_value: '', requires_text: true },
  ],
  mediums: [
    { value: 'SOCIAL', label: 'Social', utm_value: 'social', requires_text: false },
    { value: 'OTHER', label: 'Other', utm_value: '', requires_text: true },
  ],
};

const typed = (options: ShortLinkOptions) => ({
  __typename: 'ShortLinkOptions',
  sources: options.sources.map((option) => ({ __typename: 'ShortLinkOption', ...option })),
  mediums: options.mediums.map((option) => ({ __typename: 'ShortLinkOption', ...option })),
});

export const shortLinkOptionsMock = (
  options: ShortLinkOptions = OPTIONS,
): MockedResponse => ({
  request: { query: SHORT_LINK_OPTIONS },
  result: { data: { shortLinkOptions: typed(options) } },
  maxUsageCount: 20,
});

export const campaignsForShortLinkMock = (
  campaigns = [{ campaign_id: 'camp-1', name: 'Badminton Launch' }],
): MockedResponse => ({
  request: { query: CAMPAIGNS_FOR_SHORT_LINK },
  result: {
    data: {
      marketingCampaigns: campaigns.map((campaign) => ({
        __typename: 'MarketingCampaign',
        ...campaign,
      })),
    },
  },
  maxUsageCount: 20,
});

export const shortLinkQrMock = (opts: { pending?: boolean } = {}): MockedResponse => ({
  request: { query: SHORT_LINK_QR },
  variableMatcher: () => true,
  result: { data: { shortLinkQr: 'data:image/png;base64,QRQRQR' } },
  ...(opts.pending ? { delay: Infinity } : {}),
  maxUsageCount: 20,
});

export const createShortLinkMock = (
  over: Partial<ShortLinkRow> = {},
  opts: { failWith?: string } = {},
): MockedResponse => ({
  request: { query: CREATE_SHORT_LINK },
  variableMatcher: () => true,
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : {
        result: {
          data: {
            createShortLink: { __typename: 'ShortLink', ...makeShortLinkRow(over) },
          },
        },
      }),
});

export const setShortLinkActiveMock = (isActive = false): MockedResponse => ({
  request: { query: SET_SHORT_LINK_ACTIVE },
  variableMatcher: () => true,
  result: {
    data: {
      setShortLinkActive: { __typename: 'ShortLink', id: 'sl1', is_active: isActive },
    },
  },
});

export const deleteShortLinkMock = (opts: { failWith?: string } = {}): MockedResponse => ({
  request: { query: DELETE_SHORT_LINK },
  variableMatcher: () => true,
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { deleteShortLink: true } } }),
});

export const makeShortLinkClickRow = (
  over: Partial<ShortLinkClickRow> = {},
): ShortLinkClickRow => ({
  id: 'clk1',
  click_id: 'c-1',
  clicked_at: '2026-07-31T09:00:00.000Z',
  platform: 'Instagram',
  referrer_host: 'instagram.com',
  device_type: 'MOBILE',
  os: 'Android',
  browser: 'Chrome',
  country: 'IN',
  region: 'MH',
  city: 'Pune',
  ...over,
});

export const makeShortLinkStats = (over: Partial<ShortLinkStats> = {}): ShortLinkStats => ({
  total_clicks: 128,
  unique_visitors: 94,
  countries_reached: 3,
  daily: [
    { date: '2026-07-30', count: 40 },
    { date: '2026-07-31', count: 88 },
  ],
  platforms: [
    { label: 'Instagram', count: 90 },
    { label: 'Direct', count: 38 },
  ],
  // Deliberately all different, so a spec asserting on a number can only be
  // matching the one it means.
  devices: [{ label: 'MOBILE', count: 121 }],
  oses: [{ label: 'Android', count: 122 }],
  browsers: [{ label: 'Chrome', count: 123 }],
  countries: [{ label: 'IN', count: 124 }],
  cities: [{ label: 'Pune', count: 125 }],
  referrers: [{ label: 'instagram.com', count: 126 }],
  ...over,
});

const typedStats = (stats: ShortLinkStats) => ({
  __typename: 'ShortLinkStats',
  ...stats,
  daily: stats.daily.map((point) => ({ __typename: 'ShortLinkDailyPoint', ...point })),
  platforms: stats.platforms.map((r) => ({ __typename: 'ShortLinkBreakdown', ...r })),
  devices: stats.devices.map((r) => ({ __typename: 'ShortLinkBreakdown', ...r })),
  oses: stats.oses.map((r) => ({ __typename: 'ShortLinkBreakdown', ...r })),
  browsers: stats.browsers.map((r) => ({ __typename: 'ShortLinkBreakdown', ...r })),
  countries: stats.countries.map((r) => ({ __typename: 'ShortLinkBreakdown', ...r })),
  cities: stats.cities.map((r) => ({ __typename: 'ShortLinkBreakdown', ...r })),
  referrers: stats.referrers.map((r) => ({ __typename: 'ShortLinkBreakdown', ...r })),
});

export const shortLinkMock = (
  over: Partial<ShortLinkRow> = {},
  opts: { failWith?: string } = {},
): MockedResponse => ({
  request: { query: SHORT_LINK },
  variableMatcher: () => true,
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { shortLink: { __typename: 'ShortLink', ...makeShortLinkRow(over) } } } }),
  maxUsageCount: 20,
});

export const shortLinkStatsMock = (
  over: Partial<ShortLinkStats> = {},
  opts: { pending?: boolean } = {},
): MockedResponse => ({
  request: { query: SHORT_LINK_STATS },
  variableMatcher: () => true,
  result: { data: { shortLinkStats: typedStats(makeShortLinkStats(over)) } },
  ...(opts.pending ? { delay: Infinity } : {}),
  maxUsageCount: 20,
});

export const makeShortLinkFunnel = (over: Partial<ShortLinkFunnel> = {}): ShortLinkFunnel => ({
  revenue: 4500,
  conversion_rate: 12.5,
  steps: [
    { step: 'CLICKED', count: 40 },
    { step: 'LANDED', count: 32 },
    { step: 'SIGNED_UP', count: 18 },
    { step: 'SURVEY_DONE', count: 14 },
    { step: 'VIEWED_POD', count: 11 },
    { step: 'CHECKOUT_STARTED', count: 7 },
    { step: 'PAID', count: 5 },
  ],
  ...over,
});

export const shortLinkFunnelMock = (over: Partial<ShortLinkFunnel> = {}): MockedResponse => {
  const funnel = makeShortLinkFunnel(over);
  return {
    request: { query: SHORT_LINK_FUNNEL },
    variableMatcher: () => true,
    result: {
      data: {
        shortLinkFunnel: {
          __typename: 'ShortLinkFunnel',
          ...funnel,
          steps: funnel.steps.map((s) => ({ __typename: 'ShortLinkFunnelStep', ...s })),
        },
      },
    },
    maxUsageCount: 20,
  };
};

export const makeShortLinkJourneyRow = (
  over: Partial<ShortLinkJourneyRow> = {},
): ShortLinkJourneyRow => ({
  id: 'j1',
  click_id: 'c-1',
  clicked_at: '2026-07-31T09:00:00.000Z',
  platform: 'Instagram',
  country: 'IN',
  city: 'Pune',
  device_type: 'MOBILE',
  furthest_step: 'PAID',
  converted_amount: 1500,
  user_id: 'u1',
  user_name: 'Asha K',
  user_email: 'asha@example.com',
  steps: [
    { step: 'LANDED', at: '2026-07-31T09:00:10.000Z' },
    { step: 'SIGNED_UP', at: '2026-07-31T09:02:00.000Z' },
    { step: 'PAID', at: '2026-07-31T09:09:00.000Z' },
  ],
  conversions: [{ payment_id: 'p1', amount: 1500, at: '2026-07-31T09:09:00.000Z' }],
  ...over,
});
