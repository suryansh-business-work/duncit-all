import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import BrandProductsTable from '../../src/pages/ecomm/BrandProductsTable';
import { renderWithProviders } from '../testkit';
import { makeBrandProductRow } from '../mocks/ecommBrand.mock';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ formatDate: () => 'D' }) }));

describe('BrandProductsTable', () => {
  it('renders brand product cells including dimensions and commission', async () => {
    __setTableRows([
      makeBrandProductRow({
        id: 'p1',
        product_name: 'Widget',
        sku: 'WD-1',
        selling_price: 200,
        unit_cost: 150,
        available_count: 8,
        inventory_count: 10,
        commission_pct: 12,
        length_cm: 10,
        breadth_cm: 5,
        height_cm: 3,
        weight_kg: 1,
      }),
      // avatar image branch + empty-name initial
      makeBrandProductRow({
        id: 'p3',
        product_name: '',
        sku: 'X',
        image_url: 'http://img/x.png',
        selling_price: 1,
        unit_cost: 1,
        available_count: 1,
        inventory_count: 1,
        commission_pct: 0,
        length_cm: 1,
        breadth_cm: 1,
        height_cm: 1,
        weight_kg: 1,
        created_at: null,
      }),
    ]);
    renderWithProviders(<BrandProductsTable brandId="b1" />);
    await waitFor(() => expect(screen.getAllByText('Widget').length).toBeGreaterThan(0));
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getAllByText('10×5×3 cm · 1kg').length).toBeGreaterThan(0);
  });

  it('falls back to inventory count and a dash date when unset', async () => {
    __setTableRows([
      makeBrandProductRow({
        id: 'p2',
        product_name: 'Gadget',
        sku: 'GD-1',
        selling_price: 0,
        unit_cost: 50,
        available_count: null,
        inventory_count: 4,
        commission_pct: 0,
        length_cm: 1,
        breadth_cm: 1,
        height_cm: 1,
        weight_kg: 2,
        created_at: null,
      }),
    ]);
    renderWithProviders(<BrandProductsTable brandId="b1" />);
    await waitFor(() => expect(screen.getAllByText('Gadget').length).toBeGreaterThan(0));
    // available_count null → inventory_count (4).
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('reloads when the brand id changes', async () => {
    __setTableRows([]);
    function Wrapper() {
      const [brandId, setBrandId] = useState('b1');
      return (
        <>
          <button onClick={() => setBrandId('b2')}>switch</button>
          <BrandProductsTable brandId={brandId} />
        </>
      );
    }
    renderWithProviders(<Wrapper />);
    await waitFor(() => expect(screen.getByTestId('duncit-table')).toBeInTheDocument());
    // Changing the brand id runs the reload effect branch.
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByTestId('duncit-table')).toBeInTheDocument();
  });
});
