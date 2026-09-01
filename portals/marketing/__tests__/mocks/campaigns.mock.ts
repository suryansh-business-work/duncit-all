import type { MockedResponse } from '@apollo/client/testing';
import type { MarketingCampaign, MarketingCampaignRender } from '@duncit/gql-types';
import {
  CREATE_MARKETING_CAMPAIGN,
  DELETE_MARKETING_CAMPAIGN,
  MARKETING_CAMPAIGN,
  MARKETING_CAMPAIGN_VARIABLES,
  RENDER_MARKETING_CAMPAIGN,
  SEND_MARKETING_CAMPAIGN,
  type MarketingCampaignDetail,
  type MarketingCampaignRow,
} from '../../src/pages/marketing-campaigns-page/queries';

/**
 * Marketing-campaign mocks. History rows feed the mocked `@duncit/table` via
 * props (typed against the app-level `MarketingCampaignRow`). Everything that
 * flows through `MockedProvider` is typed against the generated schema shapes
 * and carries `__typename`.
 */
export const makeCampaignRow = (over: Partial<MarketingCampaignRow> = {}): MarketingCampaignRow => ({
  campaign_id: 'c1',
  name: 'Weekend',
  channel: 'EMAIL',
  audience: 'ALL_USERS',
  subject: 'Subject',
  scheduled_at: null,
  sent_at: null,
  status: 'DRAFT',
  recipient_count: 3,
  open_count: 0,
  click_count: 0,
  error: null,
  created_at: '2026-01-01T00:00:00.000Z',
  card: { title: 'Pod card' },
  ...over,
});

/** One campaign in full, as the View dialog asks for it. */
export const makeCampaignDetail = (
  over: Partial<MarketingCampaignDetail> = {},
): MarketingCampaignDetail => ({
  ...makeCampaignRow(),
  rendered_html: '<b>the email</b>',
  audience_list_id: null,
  image_load_count: 0,
  first_opened_at: null,
  last_opened_at: null,
  tracked_links: [],
  tracked_images: [],
  delivery: null,
  ...over,
});

export const campaignDetailMock = (
  over: Partial<MarketingCampaignDetail> = {},
  opts: { pending?: boolean; failWith?: string } = {},
): MockedResponse => ({
  request: { query: MARKETING_CAMPAIGN, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : {
        result: {
          data: {
            marketingCampaign: {
              __typename: 'MarketingCampaign',
              ...makeCampaignDetail(over),
              tracked_links: makeCampaignDetail(over).tracked_links.map((link) => ({
                __typename: 'TrackedLink',
                ...link,
              })),
              tracked_images: makeCampaignDetail(over).tracked_images.map((image) => ({
                __typename: 'TrackedImage',
                ...image,
              })),
              delivery: makeCampaignDetail(over).delivery && {
                __typename: 'CampaignDelivery',
                ...makeCampaignDetail(over).delivery,
              },
            },
          },
        },
      }),
  ...(opts.pending ? { delay: Infinity } : {}),
  maxUsageCount: 20,
});

export const deleteCampaignMock = (opts: { failWith?: string } = {}): MockedResponse => ({
  request: { query: DELETE_MARKETING_CAMPAIGN, variables: () => true },
  ...(opts.failWith
    ? { result: { errors: [{ message: opts.failWith }] } }
    : { result: { data: { deleteMarketingCampaign: true } } }),
});

export const campaignVariablesMock = (
  variables = [{ name: 'app_name', description: 'Your app name.', sample: 'Duncit' }],
): MockedResponse => ({
  request: { query: MARKETING_CAMPAIGN_VARIABLES },
  result: {
    data: {
      marketingCampaignVariables: variables.map((v) => ({
        __typename: 'MarketingCampaignVariable',
        ...v,
      })),
    },
  },
  maxUsageCount: 20,
});

export const makeRender = (over: Partial<MarketingCampaignRender> = {}): MarketingCampaignRender => ({
  __typename: 'MarketingCampaignRender',
  subject: 'S',
  html: '<b>x</b>',
  errors: [],
  detected_variables: [],
  ...over,
});

export const renderCampaignMock = (over: Partial<MarketingCampaignRender> = {}): MockedResponse => ({
  request: { query: RENDER_MARKETING_CAMPAIGN, variables: () => true },
  result: { data: { renderMarketingCampaign: makeRender(over) } },
  maxUsageCount: 20,
});

type CampaignMutationResult = Pick<
  MarketingCampaign,
  'campaign_id' | 'status' | 'recipient_count' | 'error'
> & { __typename: 'MarketingCampaign' };

const makeCampaignResult = (error: string | null = null): CampaignMutationResult => ({
  __typename: 'MarketingCampaign',
  campaign_id: 'c1',
  status: 'SENT',
  recipient_count: 5,
  error,
});

export const createCampaignMock = (
  over: { serverError?: string | null; throwMessage?: string; throwEmpty?: boolean } = {},
): MockedResponse => {
  if (over.throwEmpty) {
    return {
      request: { query: CREATE_MARKETING_CAMPAIGN, variables: () => true },
      result: { errors: [{ message: '' }] },
    };
  }
  if (over.throwMessage) {
    return {
      request: { query: CREATE_MARKETING_CAMPAIGN, variables: () => true },
      result: { errors: [{ message: over.throwMessage }] },
    };
  }
  return {
    request: { query: CREATE_MARKETING_CAMPAIGN, variables: () => true },
    result: { data: { createMarketingCampaign: makeCampaignResult(over.serverError ?? null) } },
  };
};

export const sendCampaignMock = (
  over: { serverError?: string | null; throwMessage?: string; throwEmpty?: boolean } = {},
): MockedResponse => {
  if (over.throwEmpty) {
    return {
      request: { query: SEND_MARKETING_CAMPAIGN, variables: () => true },
      result: { errors: [{ message: '' }] },
    };
  }
  if (over.throwMessage) {
    return {
      request: { query: SEND_MARKETING_CAMPAIGN, variables: () => true },
      result: { errors: [{ message: over.throwMessage }] },
    };
  }
  return {
    request: { query: SEND_MARKETING_CAMPAIGN, variables: () => true },
    result: { data: { sendMarketingCampaign: makeCampaignResult(over.serverError ?? null) } },
  };
};
