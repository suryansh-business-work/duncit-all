import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDateTime } from '@duncit/app-settings';
import UserFinanceSection from '../UserFinanceSection';
import FinanceSummary from '../UserFinanceSection/FinanceSummary';
import { USER_FINANCE_SUMMARY } from '../UserFinanceSection/queries';
import { renderWithProviders } from './testkit';

/**
 * The real column helpers (`dateColumn`, `EM_DASH`) stay; only the grid (AG Grid
 * needs a layout engine jsdom lacks) and the Apollo fetch are replaced, so each
 * log can serve its own rows and record how it scoped the query.
 */
const tableState = vi.hoisted(() => ({
  rowsByKey: {} as Record<string, unknown[]>,
  calls: [] as { key: string; options: unknown }[],
}));

vi.mock('@duncit/table', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@duncit/table');
  const stub = await import('../../../__tests__/table-mock');
  return {
    ...actual,
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: (_client: unknown, _doc: unknown, key: string, options: unknown) => {
      tableState.calls.push({ key, options });
      return async () => {
        const rows = tableState.rowsByKey[key] ?? [];
        return { rows, total: rows.length };
      };
    },
  };
});

const USER_ID = 'u-fin-1';

const summary = (over: Record<string, unknown> = {}) => ({
  __typename: 'UserFinanceSummary',
  currency_symbol: '₹',
  payment_count: 3,
  failed_count: 1,
  paid_total: 1500,
  refund_count: 1,
  refunded_total: 250.5,
  net_business: 1249.5,
  coins_redeemed: 30,
  last_paid_at: '2026-03-01T10:00:00.000Z',
  coins: { __typename: 'UserFinanceCoins', balance: 120, lifetime_earned: 200, credited: 210, debited: 90 },
  ...over,
});

const summaryMock = (over: Record<string, unknown> = {}, extra: Partial<MockedResponse> = {}): MockedResponse => ({
  request: { query: USER_FINANCE_SUMMARY, variables: { user_id: USER_ID } },
  result: { data: { userFinanceSummary: summary(over) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  ...extra,
});

beforeEach(() => {
  tableState.rowsByKey = {};
  tableState.calls = [];
});

describe('FinanceSummary', () => {
  it('shows four skeleton tiles while the summary loads', () => {
    const { container } = renderWithProviders(<FinanceSummary userId={USER_ID} />, {
      mocks: [summaryMock({}, { delay: 60_000 })],
    });

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(4);
    expect(screen.queryByTestId('user-finance-net')).toBeNull();
  });

  it('shows the tiles with money, counts and the coin wallet', async () => {
    renderWithProviders(<FinanceSummary userId={USER_ID} />, { mocks: [summaryMock()] });

    const net = await screen.findByTestId('user-finance-net');
    expect(screen.getByRole('heading', { level: 3, name: 'Business from this user' })).toBeInTheDocument();
    expect(within(net).getByText('Net business')).toBeInTheDocument();
    expect(within(net).getByText('₹1,249.50')).toBeInTheDocument();
    expect(
      within(net).getByText(`Last paid ${formatDateTime('2026-03-01T10:00:00.000Z')}`),
    ).toBeInTheDocument();

    const paid = screen.getByTestId('user-finance-paid');
    expect(within(paid).getByText('₹1,500.00')).toBeInTheDocument();
    expect(within(paid).getByText('3 payments')).toBeInTheDocument();
    expect(within(paid).getByText('1 failed payments')).toBeInTheDocument();

    const refunded = screen.getByTestId('user-finance-refunded');
    expect(within(refunded).getByText('₹250.50')).toBeInTheDocument();
    expect(within(refunded).getByText('1 refunds')).toBeInTheDocument();

    const coins = screen.getByTestId('user-finance-coins');
    expect(within(coins).getByText('Coin balance')).toBeInTheDocument();
    expect(within(coins).getByText('120')).toBeInTheDocument();
    expect(within(coins).getByText('200 earned in all')).toBeInTheDocument();
    expect(within(coins).getByText('Coins credited: 210 · Coins debited: 90')).toBeInTheDocument();
    expect(within(coins).getByText('30 spent at checkout')).toBeInTheDocument();
  });

  it('says "No payment yet", uses the default symbol, and hides coins the role cannot read', async () => {
    renderWithProviders(<FinanceSummary userId={USER_ID} />, {
      mocks: [summaryMock({ last_paid_at: null, currency_symbol: null, coins: null, net_business: 0 })],
    });

    const net = await screen.findByTestId('user-finance-net');
    expect(within(net).getByText('No payment yet')).toBeInTheDocument();
    expect(within(net).getByText('₹0.00')).toBeInTheDocument();

    const coins = screen.getByTestId('user-finance-coins');
    expect(within(coins).getByText('—')).toBeInTheDocument();
    expect(within(coins).getByText('Your role cannot read Duncit Coin.')).toBeInTheDocument();
  });

  it('shows the error with its reason when the summary fails', async () => {
    renderWithProviders(<FinanceSummary userId={USER_ID} />, {
      mocks: [{ request: { query: USER_FINANCE_SUMMARY, variables: { user_id: USER_ID } }, error: new Error('Finance down') }],
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load this user’s payment summary.');
    expect(alert).toHaveTextContent('Finance down');
    expect(screen.queryByTestId('user-finance-net')).toBeNull();
  });

  it('renders nothing when there is no user id to ask about', () => {
    const { container } = renderWithProviders(<FinanceSummary userId="" />);

    expect(container.querySelector('.MuiSkeleton-root')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('user-finance-net')).toBeNull();
  });
});

describe('UserFinanceSection', () => {
  it('lists payments and refunds narrowed to the account, plus the coin ledger when readable', async () => {
    tableState.rowsByKey = {
      paymentsTable: [
        {
          id: 'p-1',
          payment_id: 'pay_1',
          invoice_no: 'INV-1',
          description: 'Pod: Run',
          total: 100,
          coins_redeemed: null,
          coins_earned: 5,
          currency_symbol: '₹',
          status: 'SUCCESS',
          gateway: 'RAZORPAY',
          paid_at: null,
          created_at: '2026-03-01T10:00:00.000Z',
        },
      ],
      coinTransactionsTable: [
        {
          id: 'c-1',
          type: 'DEBIT',
          amount: 10,
          balance_after: 90,
          source: 'PAYMENT_REDEEM',
          reason: '',
          payment_id: 'pay_1',
          created_at: '2026-03-01T10:00:00.000Z',
        },
      ],
    };
    renderWithProviders(<UserFinanceSection userId={USER_ID} />, { mocks: [summaryMock()] });

    const coinsLog = await screen.findByTestId('admin-user-coins');
    expect(within(coinsLog).getByRole('heading', { name: 'Duncit Coin' })).toBeInTheDocument();
    await waitFor(() => expect(within(coinsLog).getByTestId('value-amount')).toHaveTextContent('-10'));
    expect(within(coinsLog).getByTestId('value-source')).toHaveTextContent('Spent at checkout');
    expect(within(coinsLog).getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search by payment ID or reason',
    );

    const payments = screen.getByTestId('admin-user-payments');
    expect(within(payments).getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    await waitFor(() => expect(within(payments).getByTestId('value-total')).toHaveTextContent('₹100.00'));
    expect(within(payments).getByText('pay_1')).toBeInTheDocument();
    expect(within(payments).getByTestId('col-gateway')).toHaveTextContent('Gateway');

    const refunds = screen.getByTestId('admin-user-refunds');
    expect(within(refunds).getByRole('heading', { name: 'Refunds' })).toBeInTheDocument();
    await waitFor(() =>
      expect(within(refunds).getByTestId('table-empty')).toHaveTextContent('Nothing has been refunded to this user.'),
    );

    const filter = { extraFilters: [{ field: 'user_id', op: 'eq', value: USER_ID }] };
    expect(tableState.calls).toEqual(
      expect.arrayContaining([
        { key: 'paymentsTable', options: filter },
        { key: 'userRefundsTable', options: filter },
        { key: 'coinTransactionsTable', options: filter },
      ]),
    );
  });

  it('leaves out the coin ledger when the role cannot read Duncit Coin', async () => {
    renderWithProviders(<UserFinanceSection userId={USER_ID} />, { mocks: [summaryMock({ coins: null })] });

    await screen.findByText('Your role cannot read Duncit Coin.');
    expect(screen.getByTestId('admin-user-payments')).toBeInTheDocument();
    expect(screen.getByTestId('admin-user-refunds')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-user-coins')).toBeNull();
    expect(tableState.calls.some((call) => call.key === 'coinTransactionsTable')).toBe(false);
  });

  it('fetches no rows and shows the empty copy while there is no user id', async () => {
    tableState.rowsByKey = { paymentsTable: [{ id: 'p-x' }] };
    renderWithProviders(<UserFinanceSection userId="" />);

    const payments = screen.getByTestId('admin-user-payments');
    await waitFor(() =>
      expect(within(payments).getByTestId('table-empty')).toHaveTextContent('This user has made no payments.'),
    );
    expect(within(payments).queryAllByTestId('table-row')).toHaveLength(0);
    expect(screen.queryByTestId('admin-user-coins')).toBeNull();
  });
});
