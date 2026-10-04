import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import type { DuncitColumn } from '@duncit/table';
import UserShopOrders from '../UserShopOrders';
import UserLog from '../UserFinanceSection/UserLog';
import { USER_SHOP_ORDERS_TABLE, type UserShopOrderRow } from '../UserShopOrders/queries';
import { renderWithProviders } from './testkit';

/**
 * The real column helpers (`dateColumn`, `EM_DASH`) stay; only the grid (AG Grid
 * needs a layout engine jsdom lacks) and the Apollo fetch are replaced, so the
 * log serves its own rows and records how it scoped the query.
 */
const tableState = vi.hoisted(() => ({
  rows: [] as unknown[],
  hooks: [] as { key: string; options: unknown; deps: unknown }[],
  queries: [] as unknown[],
}));

vi.mock('@duncit/table', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@duncit/table');
  const stub = await import('../../../__tests__/table-mock');
  return {
    ...actual,
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: (_client: unknown, _doc: unknown, key: string, options: unknown, deps: unknown) => {
      tableState.hooks.push({ key, options, deps });
      return async (q: unknown) => {
        tableState.queries.push(q);
        return { rows: tableState.rows, total: tableState.rows.length };
      };
    },
  };
});

const USER_ID = 'u-shop-1';

const order = (over: Partial<UserShopOrderRow> = {}): UserShopOrderRow => ({
  id: 'o-1',
  order_no: 'PS-1001',
  created_at: '2026-03-01T10:00:00.000Z',
  currency_symbol: '₹',
  total: 1249.5,
  fulfilment_method: 'DELIVERY',
  fulfilment_status: 'DELIVERED',
  delivered_at: '2026-03-04T12:30:00.000Z',
  cancelled_at: null,
  cancel_reason: '',
  pod: { id: 'pod-1', pod_title: 'Sunday Run Club' },
  line_items: [
    { name: 'Water bottle', variant_label: 'Blue', qty: 2 },
    { name: 'Cap', variant_label: '', qty: 1 },
  ],
  refund: { status: 'PROCESSED', amount: 200, coins: 0 },
  ...over,
});

const cancelled = order({
  id: 'o-2',
  order_no: 'PS-1002',
  fulfilment_status: 'CANCELLED',
  delivered_at: null,
  cancelled_at: '2026-03-02T09:00:00.000Z',
  cancel_reason: 'Out of stock',
  pod: null,
  line_items: [{ name: 'Towel', variant_label: 'L', qty: 1 }],
  refund: { status: 'NONE', amount: 0, coins: 0 },
});

beforeEach(() => {
  tableState.rows = [];
  tableState.hooks = [];
  tableState.queries = [];
});

describe('UserShopOrders', () => {
  it('scopes the query by the user_id argument rather than a filter, newest first', async () => {
    renderWithProviders(<UserShopOrders userId={USER_ID} />);

    const log = screen.getByTestId('admin-user-shop-orders');
    expect(within(log).getByRole('heading', { level: 3, name: 'Pod Shop orders' })).toBeInTheDocument();
    expect(within(log).getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search by order number',
    );
    await waitFor(() =>
      expect(within(log).getByTestId('table-empty')).toHaveTextContent(
        'This user has not ordered anything from the Pod Shop.',
      ),
    );
    expect(tableState.hooks.at(-1)).toEqual({
      key: 'userProductOrdersTable',
      options: { extraVariables: { user_id: USER_ID } },
      deps: [USER_ID, 'user_id'],
    });
    expect(tableState.queries).toEqual([
      expect.objectContaining({ sortBy: 'created_at', sortDir: 'desc' }),
    ]);
  });

  it('lists every column header in order', () => {
    renderWithProviders(<UserShopOrders userId={USER_ID} />);

    const headers = within(screen.getByTestId('table-headers'))
      .getAllByText(/./)
      .map((el) => el.textContent);
    expect(headers).toEqual(['Placed', 'Order', 'Items', 'Total', 'Status', 'Delivered', 'Refund', 'Cancel reason']);
  });

  it('renders a delivered order with its pod, items, money, status and processed refund', async () => {
    tableState.rows = [order()];
    renderWithProviders(<UserShopOrders userId={USER_ID} />);

    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-created_at')).toHaveTextContent(
      formatDateTime(new Date('2026-03-01T10:00:00.000Z')),
    );
    const orderCell = within(row).getByTestId('cell-order_no');
    expect(within(orderCell).getByText('PS-1001')).toBeInTheDocument();
    expect(within(orderCell).getByText('Sunday Run Club')).toBeInTheDocument();
    expect(within(row).getByTestId('value-line_items')).toHaveTextContent('Water bottle (Blue) × 2, Cap × 1');
    expect(within(row).getByTestId('value-total')).toHaveTextContent('₹1,249.50');
    const status = within(within(row).getByTestId('cell-fulfilment_status')).getByText('DELIVERED');
    expect(status.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(within(row).getByTestId('value-delivered_at')).toHaveTextContent(
      formatDateTime('2026-03-04T12:30:00.000Z'),
    );
    const refundCell = within(row).getByTestId('cell-refund');
    expect(within(refundCell).getByText('PROCESSED').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(within(refundCell).getByText('₹200.00')).toBeInTheDocument();
    expect(within(row).getByTestId('value-cancel_reason')).toHaveTextContent('—');
  });

  it('dashes the pod, delivery and refund of a cancelled order and shows why it was cancelled', async () => {
    tableState.rows = [cancelled];
    renderWithProviders(<UserShopOrders userId={USER_ID} />);

    const row = await screen.findByTestId('table-row');
    const orderCell = within(row).getByTestId('cell-order_no');
    expect(within(orderCell).getByText('PS-1002')).toBeInTheDocument();
    expect(within(orderCell).getByText('—')).toBeInTheDocument();
    expect(within(row).getByTestId('value-line_items')).toHaveTextContent('Towel (L) × 1');
    expect(within(row).getByText('CANCELLED').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    expect(within(row).getByTestId('value-delivered_at')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-refund')).toHaveTextContent(/^—$/);
    expect(within(row).getByTestId('value-cancel_reason')).toHaveTextContent('Out of stock');
  });

  it('leaves a status and refund outside the colour maps on the default chip colour', async () => {
    tableState.rows = [order({ fulfilment_status: 'SHIPPED', refund: { status: 'PENDING', amount: 50, coins: 0 } })];
    renderWithProviders(<UserShopOrders userId={USER_ID} />);

    const row = await screen.findByTestId('table-row');
    expect(within(row).getByText('SHIPPED').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
    expect(within(row).getByText('PENDING').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    expect(within(row).getByText('₹50.00')).toBeInTheDocument();
  });
});

describe('UserLog', () => {
  const columns: DuncitColumn<UserShopOrderRow>[] = [
    { field: 'order_no', headerName: 'Order', type: 'text', valueGetter: (row) => row.order_no },
  ];

  const renderLog = (userId: string) =>
    renderWithProviders(
      <UserLog<UserShopOrderRow>
        userId={userId}
        tableId="admin-user-test-log"
        title="Test log"
        emptyText="Nothing here."
        searchPlaceholder="Search"
        document={USER_SHOP_ORDERS_TABLE}
        rootField="paymentsTable"
        columns={columns}
        defaultSortField="refunded_at"
      />,
    );

  it('narrows a platform-wide table to the account with a user_id filter when no argument is named', async () => {
    tableState.rows = [order()];
    renderLog(USER_ID);

    const log = screen.getByTestId('admin-user-test-log');
    expect(within(log).getByRole('heading', { level: 3, name: 'Test log' })).toBeInTheDocument();
    await waitFor(() => expect(within(log).getByTestId('value-order_no')).toHaveTextContent('PS-1001'));
    expect(tableState.hooks.at(-1)).toEqual({
      key: 'paymentsTable',
      options: { extraFilters: [{ field: 'user_id', op: 'eq', value: USER_ID }] },
      deps: [USER_ID, undefined],
    });
    expect(tableState.queries).toEqual([expect.objectContaining({ sortBy: 'refunded_at', sortDir: 'desc' })]);
  });

  it('never queries without an account and shows the empty text', async () => {
    tableState.rows = [order()];
    renderLog('');

    await waitFor(() => expect(screen.getByTestId('table-empty')).toHaveTextContent('Nothing here.'));
    expect(tableState.queries).toEqual([]);
    expect(screen.queryByTestId('table-row')).toBeNull();
  });
});
