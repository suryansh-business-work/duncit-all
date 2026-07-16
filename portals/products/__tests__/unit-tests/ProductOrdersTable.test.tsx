import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductOrdersTable from '../../src/pages/orders/ProductOrdersTable';
import type { ProductOrderRow } from '../../src/pages/orders/queries';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (v: unknown) => (v ? 'DT' : '') }),
}));
vi.mock('@duncit/ui', () => ({
  StatusChip: ({ label }: { label: string }) => <span>{label}</span>,
}));

const row = (over: Partial<ProductOrderRow> = {}): ProductOrderRow =>
  ({
    id: 'o1',
    order_no: 'PO-1',
    buyer_name: 'Asha',
    buyer_email: 'asha@x.com',
    pod: { id: 'p', pod_title: 'Sunset Pod' },
    currency_symbol: '₹',
    total: 500,
    fulfilment_method: 'SHIP',
    fulfilment_status: 'OUT_FOR_DELIVERY',
    shiprocket: { awb: 'AWB9' },
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as ProductOrderRow;

describe('ProductOrdersTable', () => {
  it('renders order columns and cell content', async () => {
    render(
      <ProductOrdersTable
        fetchRows={async () => ({ rows: [row()], total: 1 })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('PO-1').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Asha').length).toBeGreaterThan(0);
    expect(screen.getByText('Sunset Pod')).toBeInTheDocument();
    expect(screen.getByText('AWB9')).toBeInTheDocument();
    expect(screen.getByText('₹500')).toBeInTheDocument();
    // Status label goes through humaniseStatus.
    expect(screen.getAllByText('OUT FOR DELIVERY').length).toBeGreaterThan(0);
  });

  it('falls back to dashes for missing pod, AWB and date', async () => {
    render(
      <ProductOrdersTable
        fetchRows={async () => ({
          rows: [row({ id: 'o2', pod: null, shiprocket: null, created_at: null } as any)],
          total: 1,
        })}
        refetchRef={{ current: null }}
        onView={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('PO-1').length).toBeGreaterThan(0));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('invokes onView when a row is clicked', async () => {
    const onView = vi.fn();
    render(
      <ProductOrdersTable
        fetchRows={async () => ({ rows: [row()], total: 1 })}
        refetchRef={{ current: null }}
        onView={onView}
      />,
    );
    await waitFor(() => expect(screen.getAllByText('PO-1').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('PO-1')[0]);
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1' }));
  });
});
