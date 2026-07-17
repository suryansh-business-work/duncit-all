import type { MockedResponse } from '@apollo/client/testing';
import type {
  MarketingCampaign,
  MarketingCampaignPreviewCard,
  MarketingCampaignRender,
} from '@duncit/gql-types';
import {
  CREATE_MARKETING_CAMPAIGN,
  MARKETING_PREVIEW_CARDS,
  RENDER_MARKETING_CAMPAIGN,
  SEND_MARKETING_CAMPAIGN,
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
  error: null,
  created_at: '2026-01-01T00:00:00.000Z',
  card: { title: 'Pod card' },
  ...over,
});

export type PreviewCardResp = Pick<
  MarketingCampaignPreviewCard,
  'id' | 'type' | 'title' | 'description' | 'image_url' | 'cta_url' | 'meta'
> & { __typename: 'MarketingCampaignPreviewCard' };

export const makePreviewCard = (over: Partial<PreviewCardResp> = {}): PreviewCardResp => ({
  __typename: 'MarketingCampaignPreviewCard',
  id: 'p1',
  type: 'POD',
  title: 'Pod One',
  description: null,
  image_url: null,
  cta_url: null,
  meta: null,
  ...over,
});

export const podCardsMock = (
  cards: PreviewCardResp[] = [makePreviewCard()],
  opts: { pending?: boolean } = {},
): MockedResponse => ({
  request: { query: MARKETING_PREVIEW_CARDS },
  variableMatcher: (vars) => vars?.type === 'POD',
  result: { data: { marketingCampaignPreviewCards: cards } },
  ...(opts.pending ? { delay: Infinity } : {}),
  maxUsageCount: 20,
});

export const clubCardsMock = (
  cards: PreviewCardResp[] = [makePreviewCard({ id: 'c1', type: 'CLUB', title: 'Club One' })],
  opts: { pending?: boolean } = {},
): MockedResponse => ({
  request: { query: MARKETING_PREVIEW_CARDS },
  variableMatcher: (vars) => vars?.type === 'CLUB',
  result: { data: { marketingCampaignPreviewCards: cards } },
  ...(opts.pending ? { delay: Infinity } : {}),
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
  request: { query: RENDER_MARKETING_CAMPAIGN },
  variableMatcher: () => true,
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
      request: { query: CREATE_MARKETING_CAMPAIGN },
      variableMatcher: () => true,
      result: { errors: [{ message: '' }] },
    };
  }
  if (over.throwMessage) {
    return {
      request: { query: CREATE_MARKETING_CAMPAIGN },
      variableMatcher: () => true,
      result: { errors: [{ message: over.throwMessage }] },
    };
  }
  return {
    request: { query: CREATE_MARKETING_CAMPAIGN },
    variableMatcher: () => true,
    result: { data: { createMarketingCampaign: makeCampaignResult(over.serverError ?? null) } },
  };
};

export const sendCampaignMock = (
  over: { serverError?: string | null; throwMessage?: string; throwEmpty?: boolean } = {},
): MockedResponse => {
  if (over.throwEmpty) {
    return {
      request: { query: SEND_MARKETING_CAMPAIGN },
      variableMatcher: () => true,
      result: { errors: [{ message: '' }] },
    };
  }
  if (over.throwMessage) {
    return {
      request: { query: SEND_MARKETING_CAMPAIGN },
      variableMatcher: () => true,
      result: { errors: [{ message: over.throwMessage }] },
    };
  }
  return {
    request: { query: SEND_MARKETING_CAMPAIGN },
    variableMatcher: () => true,
    result: { data: { sendMarketingCampaign: makeCampaignResult(over.serverError ?? null) } },
  };
};
