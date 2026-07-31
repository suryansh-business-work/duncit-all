import type { MockedResponse } from '@apollo/client/testing';
import {
  CAMPAIGNS_FOR_SHORT_LINK,
  CREATE_SHORT_LINK,
  DELETE_SHORT_LINK,
  SET_SHORT_LINK_ACTIVE,
  SHORT_LINK_OPTIONS,
  SHORT_LINK_QR,
  type ShortLinkOptions,
  type ShortLinkRow,
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
