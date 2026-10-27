import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BrandDeliveryPincodesTable from '../../src/pages/catalog-brands/delivery-pincodes/BrandDeliveryPincodesTable';
import type { BrandDeliveryPincodeRow } from '../../src/pages/catalog-brands/delivery-pincodes/queries';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDate: (v: string) => `on ${v.slice(0, 10)}` }),
}));

const row = (over: Partial<BrandDeliveryPincodeRow> = {}): BrandDeliveryPincodeRow => ({
  id: 'r1',
  pincode: '411001',
  serviceable: true,
  courier_name: 'Delhivery',
  etd: '3 days',
  checked_at: '2026-05-01T10:00:00.000Z',
  sync_error: '',
  ...over,
});

const renderTable = async (rows: BrandDeliveryPincodeRow[]) => {
  const onRemove = vi.fn();
  render(
    <BrandDeliveryPincodesTable
      fetchRows={async () => ({ rows, total: rows.length })}
      refetchRef={{ current: null }}
      onRemove={onRemove}
    />,
  );
  await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(rows.length));
  return { onRemove, rows: () => screen.getAllByTestId('table-row') };
};

describe('BrandDeliveryPincodesTable', () => {
  it('shows serviceable, not serviceable and unchecked pincodes with their courier and check date', async () => {
    const { rows } = await renderTable([
      row(),
      row({ id: 'r2', pincode: '560001', serviceable: false, courier_name: '', etd: '', checked_at: '2026-05-02T10:00:00.000Z', sync_error: 'No lane' }),
      row({ id: 'r3', pincode: '110001', serviceable: null, courier_name: 'Bluedart', etd: '', checked_at: null }),
    ]);
    const [a, b, c] = rows();
    expect(within(a).getAllByText('Serviceable').length).toBeGreaterThan(0);
    expect(within(a).getByText('Delhivery · 3 days')).toBeInTheDocument();
    expect(within(a).getByText('on 2026-05-01')).toBeInTheDocument();
    expect(within(b).getAllByText('Not serviceable').length).toBeGreaterThan(0);
    expect(within(b).getByText('on 2026-05-02')).toBeInTheDocument();
    expect(within(c).getAllByText('Not checked').length).toBeGreaterThan(0);
    expect(within(c).getByText('Bluedart')).toBeInTheDocument();
    // No courier and no ETA, and a never-checked pincode, fall back to a dash.
    expect(within(b).getAllByText('—')).toHaveLength(1);
    expect(within(c).getAllByText('—')).toHaveLength(1);
  });

  it('hands the row to onRemove from the delete button, labelled with its pincode', async () => {
    const target = row({ id: 'r9', pincode: '700001' });
    const { onRemove } = await renderTable([target]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete 700001' }));
    expect(onRemove).toHaveBeenCalledWith(target);
  });

  it('shows the empty-state copy and the column headers', async () => {
    render(
      <BrandDeliveryPincodesTable fetchRows={async () => ({ rows: [], total: 0 })} refetchRef={{ current: null }} onRemove={vi.fn()} />,
    );
    expect(await screen.findByText('No pincodes yet — this brand delivers everywhere.')).toBeInTheDocument();
    expect(screen.getByTestId('col-pincode')).toHaveTextContent('Pincode');
    expect(screen.getByTestId('col-courier_name')).toHaveTextContent('Courier · ETA');
  });
});
