/**
 * The page one coupon opens onto.
 *
 * Apollo is stood in for by operation name so each of the three queries can be
 * answered independently — the states that mattered in review are the ones
 * where they DISAGREE: a coupon that resolved to null while its stats threw,
 * and figures that have not landed yet under a header that already has a code.
 * The facts panel and the redemption columns have suites of their own, so the
 * table is a stub here and what is under test is this page's own wiring.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CouponDetailPage from '../src/detail/CouponDetailPage';
import { DELETE_COUPON, UPDATE_COUPON } from '../src/queries';
import type { CouponRedemptionRow, CouponRow, CouponStats } from '../src/queries';

const COUPON_ROW: CouponRow = {
  id: 'c-1',
  code: 'SUMMER25',
  description: 'Summer sale',
  discount_pct: 25,
  scope: 'GLOBAL',
  pod_id: null,
  pod: null,
  valid_from: '2026-08-01T12:00:00.000Z',
  valid_until: '2026-08-31T12:00:00.000Z',
  max_uses: 100,
  per_user_limit: 1,
  min_order_amount: 500,
  used_count: 7,
  is_active: true,
  created_at: '2026-08-01T12:00:00.000Z',
  updated_at: '2026-08-02T12:00:00.000Z',
};

const STATS: CouponStats = {
  used_count: 7,
  unique_users: 6,
  total_discount: 4300,
  order_value: 28000,
  remaining_uses: 93,
  last_redeemed_at: '2026-08-14T12:00:00.000Z',
  currency_symbol: '₹',
};

const REDEMPTION: CouponRedemptionRow = {
  id: 'r-1',
  payment_id: 'pay_MkJ8102',
  invoice_no: 'DUN-INV-000241',
  user_id: 'u-1',
  user_name: 'Ananya Rao',
  user_email: 'ananya@example.com',
  user_phone: '+919812345678',
  pod_id: 'pod-1',
  description: 'Sunday Badminton',
  total: 1250,
  coupon_discount: 312,
  status: 'SUCCESS',
  paid_at: '2026-08-14T12:00:00.000Z',
  created_at: '2026-08-14T12:00:00.000Z',
};

const h = vi.hoisted(() => ({
  /** Queries are answered by operation name — the documents are not importable
   * from inside a hoisted mock factory. */
  operationName: (document: any): string => document?.definitions?.[0]?.name?.value ?? '',
  queries: {} as Record<string, any>,
  mutate: vi.fn(),
  confirm: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  refetch: vi.fn(),
  fetchRows: vi.fn(),
  tableFetchArgs: [] as unknown[],
  attachRefetch: true,
  rows: [] as CouponRedemptionRow[],
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: (document: unknown) => h.queries[h.operationName(document)] ?? { data: undefined },
    useMutation: (document: unknown) => [(options: unknown) => h.mutate(document, options)],
  };
});

vi.mock('@duncit/app-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/app-settings')>();
  return {
    ...actual,
    useDateFormat: () => ({ formatDateTime: (v: Date | string) => `at ${String(v).slice(0, 10)}` }),
  };
});

vi.mock('@duncit/dialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/dialogs')>();
  return {
    ...actual,
    useConfirm: () => h.confirm,
    notifySuccess: (message: string) => h.notifySuccess(message),
    notifyError: (message: string) => h.notifyError(message),
  };
});

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  return {
    ...actual,
    useApolloTableFetch: (...args: unknown[]) => {
      h.tableFetchArgs = args;
      return h.fetchRows;
    },
    DuncitTable: (props: Record<string, any>) => {
      if (h.attachRefetch) props.refetchRef.current = h.refetch;
      return (
        <div data-testid="redemptions">
          {h.rows.map((r) => (
            <span key={props.getRowId(r)} data-testid={`row-${props.getRowId(r)}`}>
              {r.user_name}
            </span>
          ))}
        </div>
      );
    },
  };
});

vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: () => <div />,
}));

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const mount = (path = '/coupons/c-1') =>
  render(
    <ThemeProvider theme={testTheme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/coupons" element={<div>coupons list</div>} />
          <Route path="/coupons/:couponId" element={<CouponDetailPage />} />
          <Route path="/detached" element={<CouponDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.attachRefetch = true;
  h.rows = [REDEMPTION];
  h.queries = {
    Coupon: {
      data: { coupon: COUPON_ROW },
      loading: false,
      error: undefined,
      refetch: vi.fn().mockResolvedValue({}),
    },
    CouponStats: {
      data: { couponStats: STATS },
      loading: false,
      error: undefined,
      refetch: vi.fn().mockResolvedValue({}),
    },
    CouponPods: { data: { pods: [{ id: 'pod-1', pod_title: 'Sunday Badminton' }] } },
  };
  h.confirm.mockResolvedValue(true);
  h.mutate.mockResolvedValue({ data: {} });
});

describe('CouponDetailPage', () => {
  it('holds a skeleton under the generic title until the coupon lands', () => {
    h.queries.Coupon = { data: undefined, loading: true, error: undefined, refetch: vi.fn() };
    h.queries.CouponStats = { data: undefined, loading: true, error: undefined, refetch: vi.fn() };
    h.queries.CouponPods = { data: undefined };
    const { container } = mount();

    expect(screen.getByText('Coupons')).toBeInTheDocument();
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('keeps the header and the actions while only the figures are still coming', () => {
    h.queries.CouponStats = { data: undefined, loading: true, error: undefined, refetch: vi.fn() };
    const { container } = mount();

    expect(screen.getByText('SUMMER25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
    expect(screen.queryByTestId('redemptions')).toBeNull();
  });

  it('says a deleted coupon is gone rather than reporting a load failure', () => {
    h.queries.Coupon = { data: { coupon: null }, loading: false, error: undefined, refetch: vi.fn() };
    h.queries.CouponStats = {
      data: undefined,
      loading: false,
      error: new Error('Coupon not found'),
      refetch: vi.fn(),
    };
    mount();

    expect(screen.getByText('This coupon no longer exists.')).toBeInTheDocument();
    expect(screen.queryByText('Coupon not found')).toBeNull();
  });

  it('goes back to the list from the not-found header', async () => {
    h.queries.Coupon = { data: { coupon: null }, loading: false, error: undefined, refetch: vi.fn() };
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await settle();

    expect(screen.getByText('coupons list')).toBeInTheDocument();
  });

  it('surfaces the coupon query refusing', () => {
    h.queries.Coupon = {
      data: undefined,
      loading: false,
      error: new Error('Not authorised'),
      refetch: vi.fn(),
    };
    mount();

    expect(screen.getByText('Not authorised')).toBeInTheDocument();
  });

  it('surfaces a stats failure once the coupon itself has loaded', () => {
    h.queries.CouponStats = {
      data: undefined,
      loading: false,
      error: new Error('Stats unavailable'),
      refetch: vi.fn(),
    };
    mount();

    expect(screen.getByText('Stats unavailable')).toBeInTheDocument();
  });

  it('states the coupon, its figures and the payments behind them', () => {
    mount();

    expect(screen.getByText('SUMMER25')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('93 left')).toBeInTheDocument();
    expect(screen.getByText('Who used this coupon')).toBeInTheDocument();
    expect(screen.getByTestId('row-r-1')).toHaveTextContent('Ananya Rao');
    expect(h.tableFetchArgs[3]).toEqual({ extraVariables: { id: 'c-1' } });
  });

  it('asks the redemptions query for a blank id when the route carries none', () => {
    mount('/detached');

    expect(h.tableFetchArgs[3]).toEqual({ extraVariables: { id: '' } });
  });

  it('edits the coupon it is showing and refreshes the facts, figures and table', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await settle();
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit coupon');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();

    expect(h.mutate).toHaveBeenCalledWith(UPDATE_COUPON, {
      variables: expect.objectContaining({ id: 'c-1' }),
    });
    expect(h.notifySuccess).toHaveBeenCalledWith('Coupon updated');
    expect(h.queries.Coupon.refetch).toHaveBeenCalled();
    expect(h.queries.CouponStats.refetch).toHaveBeenCalled();
    expect(h.refetch).toHaveBeenCalled();
  });

  it('stays up when the refreshes after a save fail, and when the table offered none', async () => {
    h.attachRefetch = false;
    h.queries.Coupon.refetch = vi.fn().mockRejectedValue(new Error('offline'));
    h.queries.CouponStats.refetch = vi.fn().mockRejectedValue(new Error('offline'));
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();

    expect(h.notifySuccess).toHaveBeenCalledWith('Coupon updated');
    expect(h.refetch).not.toHaveBeenCalled();
    expect(screen.getByText('SUMMER25')).toBeInTheDocument();
  });

  it('closes the edit dialog without writing anything on cancel', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await settle();

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.mutate).not.toHaveBeenCalled();
  });

  it('names the code in the delete confirm and does nothing when declined', async () => {
    h.confirm.mockResolvedValue(false);
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await settle();

    expect(h.confirm).toHaveBeenCalledWith({
      title: 'Delete coupon',
      message: expect.stringContaining('SUMMER25'),
    });
    expect(h.mutate).not.toHaveBeenCalled();
  });

  it('deletes the coupon and returns to the list it came from', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await settle();

    expect(h.mutate).toHaveBeenCalledWith(DELETE_COUPON, { variables: { id: 'c-1' } });
    expect(h.notifySuccess).toHaveBeenCalledWith('Coupon deleted');
    expect(screen.getByText('coupons list')).toBeInTheDocument();
  });

  it('surfaces the server refusing a delete and stays on the coupon', async () => {
    h.mutate.mockRejectedValue(new Error('Coupon already redeemed'));
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await settle();

    expect(h.notifyError).toHaveBeenCalledWith('Coupon already redeemed');
    expect(screen.getByText('SUMMER25')).toBeInTheDocument();
  });

  it('falls back to the localized copy when the refusal carries no message', async () => {
    h.mutate.mockRejectedValue({});
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await settle();

    expect(h.notifyError).toHaveBeenCalledWith('Could not delete coupon');
  });
});
