import type { MockedResponse } from '@apollo/client/testing';
import type { BackoutRefundRequest } from '@duncit/gql-types';
import {
  BACKOUT_FINANCE_SETTINGS,
  BACKOUT_REFUND_DETAIL,
} from '../../src/pages/finance/backout-refund-page/queries';

/**
 * Backout-refund mocks. Table rows feed the stubbed `@duncit/table` via
 * `tableControls` (not Apollo); the detail + settings objects flow through
 * `MockedProvider` and carry `__typename` on every nested node.
 */
interface PodRowMock {
  __typename?: 'Pod';
  pod_title: string | null;
  pod_type: string;
}

export type BackoutRowMock = { __typename?: 'BackoutRefundRequest' } & Pick<
  BackoutRefundRequest,
  'id' | 'user_name' | 'user_email' | 'backed_out_at' | 'joined_at' | 'payment_amount' | 'refund_status'
> & { pod: PodRowMock | null };

export const makeBackoutRow = (over: Partial<BackoutRowMock> = {}): BackoutRowMock => ({
  __typename: 'BackoutRefundRequest',
  id: 'b1',
  user_name: 'Riya',
  user_email: 'riya@x.com',
  pod: { __typename: 'Pod', pod_title: 'Yoga', pod_type: 'PHYSICAL' },
  backed_out_at: '2024-01-01T10:00:00Z',
  joined_at: '2024-01-01T09:00:00Z',
  payment_amount: 1000,
  refund_status: 'PENDING',
  ...over,
});

/** An anonymous row: no name/email/pod, unparseable joined_at. */
export const makeAnonymousBackoutRow = (): BackoutRowMock =>
  makeBackoutRow({
    id: 'b2',
    user_name: null,
    user_email: null,
    pod: null,
    backed_out_at: null,
    joined_at: 'bad-date',
    payment_amount: null,
    refund_status: 'PROCESSED',
  });

const publicSettings = (over: { currency_symbol?: string; default_backout_deduction_pct?: number } = {}) => ({
  __typename: 'PublicFinanceSettings' as const,
  currency_symbol: over.currency_symbol ?? '₹',
  default_backout_deduction_pct: over.default_backout_deduction_pct ?? 10,
});

export const backoutFinanceSettingsMock = (): MockedResponse => ({
  request: { query: BACKOUT_FINANCE_SETTINGS },
  result: { data: { publicFinanceSettings: publicSettings() } },
  maxUsageCount: 20,
});

export const backoutFinanceSettingsErrorMock = (): MockedResponse => ({
  request: { query: BACKOUT_FINANCE_SETTINGS },
  error: new Error('load fail'),
});

/* ---- Detail ---- */

interface DetailMediaMock {
  __typename?: 'PodMedia';
  url: string;
  type: string;
}

interface DetailClubMock {
  __typename?: 'Club';
  id: string;
  club_id: string;
  club_name: string;
  club_description: string | null;
}

interface DetailPodMock {
  __typename?: 'Pod';
  id: string;
  pod_id: string;
  pod_title: string | null;
  pod_date_time: string;
  pod_end_date_time: string | null;
  pod_amount: number;
  pod_type: string;
  no_of_spots: number;
  club_slug: string | null;
  venue_id: string | null;
  completed_at: string | null;
  is_deleted: boolean;
  host_names: string[];
  pod_images_and_videos: DetailMediaMock[];
  club: DetailClubMock | null;
}

interface DetailRequestMock {
  __typename?: 'BackoutRefundRequest';
  id: string;
  pod_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  status: string;
  joined_at: string;
  backed_out_at: string | null;
  refund_status: string;
  payment_id: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string | null;
  refund_threshold_pct: number;
  created_at: string;
  pod: DetailPodMock | null;
}

const makeDetailPod = (over: Partial<DetailPodMock> = {}): DetailPodMock => ({
  __typename: 'Pod',
  id: 'pod-doc-1',
  pod_id: 'POD-1',
  pod_title: 'Yoga',
  pod_date_time: '2024-01-05T09:00:00Z',
  pod_end_date_time: '2024-01-05T11:00:00Z',
  pod_amount: 1000,
  pod_type: 'PHYSICAL',
  no_of_spots: 10,
  club_slug: 'yoga-club',
  venue_id: 'v1',
  completed_at: null,
  is_deleted: false,
  host_names: ['Asha', 'Ravi'],
  pod_images_and_videos: [{ __typename: 'PodMedia', url: 'https://img/pic.jpg', type: 'IMAGE' }],
  club: { __typename: 'Club', id: 'c1', club_id: 'CLUB-1', club_name: 'Yoga Club', club_description: 'desc' },
  ...over,
});

export const makeBackoutDetail = (over: Partial<DetailRequestMock> = {}): DetailRequestMock => ({
  __typename: 'BackoutRefundRequest',
  id: 'b1',
  pod_id: 'POD-1',
  user_id: 'u1',
  user_name: 'Riya',
  user_email: 'riya@x.com',
  status: 'BACKED_OUT',
  joined_at: '2024-01-01T09:00:00Z',
  backed_out_at: '2024-01-02T09:00:00Z',
  refund_status: 'PENDING',
  payment_id: 'pay_1',
  payment_amount: 1000,
  payment_currency: 'INR',
  payment_status: 'PAID',
  refund_threshold_pct: 50,
  created_at: '2024-01-02T09:00:00Z',
  pod: makeDetailPod(),
  ...over,
});

export { makeDetailPod };

export const backoutDetailMock = (
  request: DetailRequestMock | null = makeBackoutDetail(),
  id = 'b1',
): MockedResponse => ({
  request: { query: BACKOUT_REFUND_DETAIL, variables: { id } },
  result: {
    data: {
      backoutRefundRequest: request,
      publicFinanceSettings: publicSettings(),
    },
  },
  maxUsageCount: 20,
});

export const backoutDetailLoadingMock = (id = 'b1'): MockedResponse => ({
  request: { query: BACKOUT_REFUND_DETAIL, variables: { id } },
  result: {
    data: { backoutRefundRequest: makeBackoutDetail(), publicFinanceSettings: publicSettings() },
  },
  delay: 60_000,
});
