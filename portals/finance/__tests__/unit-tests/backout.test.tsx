import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { useApolloClient, useQuery } from '@apollo/client';
import BackoutRefundPage, { BackoutRefundDetailPage } from '../../src/pages/finance/backout-refund-page';
import { notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderRoute } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn(), useApolloClient: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseApolloClient = vi.mocked(useApolloClient);

const settings = { publicFinanceSettings: { currency_symbol: '₹', default_backout_deduction_pct: 10 } };

const rowFull = {
  id: 'b1',
  user_name: 'Riya',
  user_email: 'riya@x.com',
  pod: { pod_title: 'Yoga', pod_type: 'PHYSICAL' },
  backed_out_at: '2024-01-01T10:00:00Z',
  joined_at: '2024-01-01T09:00:00Z',
  payment_amount: 1000,
  refund_status: 'PENDING',
};
const rowEmpty = {
  id: 'b2',
  user_name: null,
  user_email: null,
  pod: null,
  backed_out_at: null,
  joined_at: 'bad-date',
  payment_amount: null,
  refund_status: 'PROCESSED',
};

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseApolloClient.mockReset().mockReturnValue({} as any);
  resetTableControls();
  (notifySuccess as any).mockClear();
});

describe('BackoutRefundPage', () => {
  it('shows an error alert when the settings query fails', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, error: new Error('load fail') } as any);
    renderRoute(<BackoutRefundPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('lists rows and processes a refund for a named member', async () => {
    mockedUseQuery.mockReturnValue({ data: settings, error: undefined } as any);
    tableControls.rows = [rowFull];
    renderRoute(<BackoutRefundPage />);

    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /process refund/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Riya')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /refund now/i }));
    expect(notifySuccess).toHaveBeenCalledWith('Refund successful');
  });

  it('shows the "this member" fallback for an anonymous row and cancels', async () => {
    mockedUseQuery.mockReturnValue({ data: settings, error: undefined } as any);
    tableControls.rows = [rowEmpty];
    renderRoute(<BackoutRefundPage />);

    fireEvent.click(await screen.findByRole('button', { name: /process refund/i }));
    expect(await screen.findByText('this member')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
  });

  it('navigates to a row detail', async () => {
    mockedUseQuery.mockReturnValue({ data: settings, error: undefined } as any);
    tableControls.rows = [rowFull];
    renderRoute(<BackoutRefundPage />, {
      extra: <Route path="/backout-refunds/:id" element={<div data-testid="detail-probe">detail</div>} />,
    });
    await waitFor(() => expect(screen.getByText('Yoga')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('row-open'));
    expect(screen.getByTestId('detail-probe')).toBeInTheDocument();
  });
});

const detailRequest = {
  id: 'b1',
  user_name: 'Riya',
  user_email: 'riya@x.com',
  payment_amount: 1000,
  payment_currency: 'INR',
  payment_status: 'PAID',
  payment_id: 'pay_1',
  refund_status: 'PENDING',
  refund_threshold_pct: 50,
  joined_at: '2024-01-01T09:00:00Z',
  backed_out_at: '2024-01-02T09:00:00Z',
  pod: {
    pod_title: 'Yoga',
    pod_date_time: '2024-01-05T09:00:00Z',
    pod_type: 'PHYSICAL',
    no_of_spots: 10,
    host_names: ['Asha', 'Ravi'],
    club_slug: 'yoga-club',
    venue_id: 'v1',
    club: { club_name: 'Yoga Club' },
    pod_images_and_videos: [{ url: 'https://img/pic.jpg', type: 'IMAGE' }],
  },
};

describe('BackoutRefundDetailPage', () => {
  const renderDetail = () =>
    renderRoute(<BackoutRefundDetailPage />, {
      path: '/backout-refunds/:id',
      entry: '/backout-refunds/b1',
      extra: <Route path="/backout-refunds" element={<div data-testid="list-probe">list</div>} />,
    });

  it('shows the loading guard', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined } as any);
    renderDetail();
    expect(screen.getByTestId('qg-loading')).toBeInTheDocument();
  });

  it('renders the full detail and navigates back', () => {
    mockedUseQuery.mockReturnValue({
      data: { backoutRefundRequest: detailRequest, publicFinanceSettings: { currency_symbol: '₹' } },
      loading: false,
      error: undefined,
    } as any);
    renderDetail();
    expect(screen.getByRole('heading', { name: 'Yoga' })).toBeInTheDocument();
    expect(screen.getByAltText('Yoga')).toBeInTheDocument();
    expect(screen.getByText('Asha, Ravi')).toBeInTheDocument();
    expect(screen.getByText('Yoga Club')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to backout refunds/i }));
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
  });

  it('renders a pod with an image but all other fields null', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        backoutRefundRequest: {
          ...detailRequest,
          user_name: null,
          user_email: null,
          payment_amount: null,
          payment_currency: null,
          payment_status: null,
          payment_id: null,
          pod: {
            ...detailRequest.pod,
            pod_title: null,
            club_slug: null,
            host_names: [],
            venue_id: null,
            club: null,
            pod_images_and_videos: [{ url: 'https://img/x.jpg', type: 'IMAGE' }],
          },
        },
        publicFinanceSettings: { currency_symbol: '₹' },
      },
      loading: false,
      error: undefined,
    } as any);
    renderDetail();
    // pod_title null → the img alt falls back to "Pod"
    expect(screen.getByAltText('Pod')).toBeInTheDocument();
  });

  it('renders the detail when the pod is missing entirely', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        backoutRefundRequest: { ...detailRequest, user_email: null, pod: null },
        publicFinanceSettings: { currency_symbol: '₹' },
      },
      loading: false,
      error: undefined,
    } as any);
    renderDetail();
    expect(screen.getByText('Backout refund')).toBeInTheDocument();
  });

  it('renders nothing when the request is not found', () => {
    mockedUseQuery.mockReturnValue({ data: { backoutRefundRequest: null, publicFinanceSettings: {} }, loading: false, error: undefined } as any);
    renderDetail();
    expect(screen.queryByRole('button', { name: /back to backout refunds/i })).not.toBeInTheDocument();
  });
});
