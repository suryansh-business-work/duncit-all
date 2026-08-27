/**
 * The shared coupons table, rendered through the REAL DuncitTable so every
 * column's value getter and renderer runs against real rows — a global code, a
 * pod code, and a pod code whose pod document has been deleted.
 */
import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CouponsTable from '../src/CouponsTable';
import type { CouponRow } from '../src/queries';

const coupon = (over: Partial<CouponRow> = {}): CouponRow =>
  (({
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
    ...over
  }) as CouponRow);

const ROWS: CouponRow[] = [
  coupon(),
  coupon({
    id: 'c-2',
    code: 'POD10',
    description: '',
    scope: 'POD',
    pod_id: 'pod-1',
    pod: { id: 'pod-1', pod_title: 'Sunday Badminton' },
    valid_from: null,
    valid_until: null,
    max_uses: null,
    used_count: 0,
    is_active: false,
  }),
  coupon({
    id: 'c-3',
    code: 'ORPHANED',
    description: '',
    scope: 'POD',
    pod_id: 'pod-gone',
    pod: null,
    valid_until: null,
    used_count: 3,
    max_uses: null,
  }),
];

/** Hoisted host: CouponsTable needs a real ref object to hand the refetch to. */
function Host({
  tableId,
  rows,
  onEdit,
  onDelete,
}: Readonly<{
  tableId: string;
  rows: CouponRow[];
  onEdit: (c: CouponRow) => void;
  onDelete: (c: CouponRow) => void;
}>) {
  const refetchRef = useRef<(() => void) | null>(null);
  return (
    <CouponsTable
      tableId={tableId}
      fetchRows={async () => ({ rows, total: rows.length })}
      refetchRef={refetchRef}
      toolbarActions={<button>New coupon</button>}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

const mount = (tableId: string, rows: CouponRow[] = ROWS) => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(<Host tableId={tableId} rows={rows} onEdit={onEdit} onDelete={onDelete} />);
  return { onEdit, onDelete };
};

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('CouponsTable', () => {
  it('renders the code with its description underneath, and alone when there is none', async () => {
    mount('coupons-code');

    expect(await screen.findByText('SUMMER25')).toBeInTheDocument();
    expect(screen.getByText('Summer sale')).toBeInTheDocument();
    expect(screen.getByText('POD10')).toBeInTheDocument();
  }, 30_000);

  it('labels a global coupon Global and a pod coupon with its pod', async () => {
    mount('coupons-scope');

    expect(await screen.findByText('Sunday Badminton')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
    // A pod-scoped code whose pod is gone still says which kind it is.
    expect(screen.getByText('Pod')).toBeInTheDocument();
  }, 30_000);

  it('shows the validity window, em-dashed when a bound is open', async () => {
    mount('coupons-validity');

    expect(await screen.findByText('01 Aug 2026 → 31 Aug 2026')).toBeInTheDocument();
    expect(screen.getAllByText('— → —').length).toBeGreaterThan(0);
  }, 30_000);

  it('shows usage against the cap, and bare when the coupon is uncapped', async () => {
    mount('coupons-used');

    expect(await screen.findByText('7 / 100')).toBeInTheDocument();
    // The toolbar's filter badge also says 0, so ask the grid cells alone.
    expect(screen.getAllByText('0').filter((el) => el.closest('.ag-cell'))).toHaveLength(1);
    expect(screen.getAllByText('3').filter((el) => el.closest('.ag-cell'))).toHaveLength(1);
  }, 30_000);

  it('shows the live flag and the discount', async () => {
    mount('coupons-active');

    expect((await screen.findAllByText('25%')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/inactive/i).length).toBeGreaterThan(0);
  }, 30_000);

  it('formats the hidden date columns once the admin shows them', async () => {
    globalThis.localStorage.setItem(
      'duncit-table-cols:coupons-dates',
      JSON.stringify({ valid_until: false, created_at: false })
    );
    mount('coupons-dates');

    expect((await screen.findAllByText('31 Aug 2026')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('01 Aug 2026').length).toBeGreaterThan(0);
  }, 30_000);

  it('hands the row to the edit and delete actions', async () => {
    const { onEdit, onDelete } = mount('coupons-actions');
    await screen.findByText('SUMMER25');

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit coupon' })[0]);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-1' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete coupon' })[1]);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-2' }));
  }, 30_000);

  it('renders the toolbar action and the empty copy on a coupon-less account', async () => {
    mount('coupons-empty', []);

    expect(await screen.findByText('No coupons yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New coupon' })).toBeInTheDocument();
  }, 30_000);
});
