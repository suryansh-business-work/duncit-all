import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { formatMoney } from '@duncit/utils';

import { TableSortDir } from '@/generated/graphql/graphql';
import { ClubAdminPodPaymentsDocument } from '@/graphql/club-pod-details';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailPayments } from '../PodDetailPayments';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `at ${value}` }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const payment = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  user_name: `Payer ${id}`,
  user_email: `${id}@x.com`,
  total: 250,
  currency_symbol: '₹',
  status: 'SUCCESS',
  paid_at: '2026-10-01T10:00:00Z',
  created_at: '2026-09-30T10:00:00Z',
  invoice_no: `INV-${id}`,
  payment_id: `pay_${id}`,
  gateway: 'RAZORPAY',
  ...patch,
});

const answer = (rows: unknown[], total = rows.length) =>
  request.mockResolvedValue({ clubAdminPodPayments: { rows, total } });

beforeEach(() => jest.clearAllMocks());

describe('PodDetailPayments', () => {
  it('reads page one of this pod payments, newest first, with a spinner meanwhile', async () => {
    answer([payment('a')]);
    renderWithProviders(<PodDetailPayments podId="p1" />);
    expect(screen.getByTestId('club-pod-detail-payments-loading')).toBeOnTheScreen();
    await screen.findByTestId('club-pod-detail-payment-a');
    expect(request).toHaveBeenCalledWith(
      ClubAdminPodPaymentsDocument,
      {
        pod_doc_id: 'p1',
        query: { page: 1, page_size: 20, sort_by: 'created_at', sort_dir: TableSortDir.Desc },
      },
      { auth: true },
    );
  });

  it('shows who paid, how much, the status and the references', async () => {
    answer([payment('a')]);
    renderWithProviders(<PodDetailPayments podId="p1" />);
    expect(await screen.findByText('Payer a')).toBeOnTheScreen();
    expect(
      screen.getByText(formatMoney(250, { symbol: '₹', decimals: 2, grouping: false })),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-payment-a-status')).toHaveTextContent('SUCCESS');
    expect(screen.getByText('at 2026-10-01T10:00:00Z')).toBeOnTheScreen();
    expect(screen.getByText('INV-a · a@x.com · RAZORPAY')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-detail-payments-badge')).toHaveTextContent('1');
  });

  it('falls back to the created time, and to the payment id, when there is no paid time or invoice', async () => {
    answer([payment('b', { paid_at: null, invoice_no: null, user_email: null, gateway: null })]);
    renderWithProviders(<PodDetailPayments podId="p1" />);
    expect(await screen.findByText('at 2026-09-30T10:00:00Z')).toBeOnTheScreen();
    expect(screen.getByText('pay_b')).toBeOnTheScreen();
  });

  it.each(['PENDING', 'FAILED', 'REFUNDED', 'SOMETHING_NEW'])(
    'shows a %s payment with its status word',
    async (status) => {
      answer([payment('c', { status })]);
      renderWithProviders(<PodDetailPayments podId="p1" />);
      expect(await screen.findByTestId('club-pod-detail-payment-c-status')).toHaveTextContent(
        status,
      );
    },
  );

  it('says there are no payments once loaded empty', async () => {
    answer([]);
    renderWithProviders(<PodDetailPayments podId="p1" />);
    expect(await screen.findByTestId('club-pod-detail-payments-empty')).toHaveTextContent(
      'podDetailsPanel.podPaymentsSection.noPaymentsRecordedForThisPod',
    );
    expect(screen.queryByTestId('club-pod-detail-payments-more')).toBeNull();
  });

  it('loads the next page on demand while more remain', async () => {
    answer([payment('a')], 2);
    renderWithProviders(<PodDetailPayments podId="p1" />);
    await screen.findByTestId('club-pod-detail-payment-a');
    request.mockResolvedValueOnce({ clubAdminPodPayments: { rows: [payment('b')], total: 2 } });
    await act(async () => {
      fireEvent.press(screen.getByTestId('club-pod-detail-payments-more'));
    });
    await screen.findByTestId('club-pod-detail-payment-b');
    expect(request.mock.calls.at(-1)?.[1].query.page).toBe(2);
    await waitFor(() => expect(screen.queryByTestId('club-pod-detail-payments-more')).toBeNull());
  });

  it('says the load failed and recovers on retry', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<PodDetailPayments podId="p1" />);
    expect(await screen.findByTestId('club-pod-detail-payments-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-detail-payments-empty')).toBeNull();
    answer([payment('a')]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('club-pod-detail-payments-error-retry'));
    });
    await waitFor(() => expect(screen.getByTestId('club-pod-detail-payment-a')).toBeOnTheScreen());
  });
});
