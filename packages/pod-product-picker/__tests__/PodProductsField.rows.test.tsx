/**
 * The attached-row side of the field: steppers and removal report one precise
 * change upward, a row whose product left the catalogue renders nothing but
 * cannot corrupt the total, and the dialog's pick lands back in the value.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodProductsField, { type PodProductRequestValue } from '../src/PodProductsField';
import { formatMoney } from '../src/format';

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const product = (over: Record<string, unknown> = {}) => ({
  __typename: 'InventoryProduct',
  id: 'p-1',
  product_name: 'Yonex Shuttlecock Tube',
  unit_cost: 450,
  available_count: 12,
  brand_name: 'Yonex',
  sku: 'YX-SC-12',
  short_description: 'Six feather shuttles.',
  description: 'A tube of six tournament-grade feather shuttles.',
  image_url: 'https://cdn.duncit.com/products/shuttle.jpg',
  images: [],
  unit_type: 'PIECE',
  weight_volume: '',
  tags: ['badminton'],
  ...over,
});

const PRODUCTS = [
  product(),
  product({ id: 'p-2', product_name: 'Grip Tape', unit_cost: 120, available_count: 6, sku: 'YX-GT-01' }),
];

const wrap = (ui: ReactElement) => render(<MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodProductsField rows', () => {
  it('steps a row down and up, one clamped change per press', async () => {
    const onChange = vi.fn();
    const value: PodProductRequestValue[] = [{ product_id: 'p-1', quantity: 3 }];
    wrap(<PodProductsField value={value} onChange={onChange} products={PRODUCTS} />);
    await settle();

    fireEvent.click(screen.getByLabelText('Decrease quantity'));
    expect(onChange).toHaveBeenLastCalledWith([{ product_id: 'p-1', quantity: 2 }]);

    fireEvent.click(screen.getByLabelText('Increase quantity'));
    expect(onChange).toHaveBeenLastCalledWith([{ product_id: 'p-1', quantity: 4 }]);
  });

  it('changes only the row that was stepped when several are attached', async () => {
    const onChange = vi.fn();
    const value: PodProductRequestValue[] = [
      { product_id: 'p-1', quantity: 1 },
      { product_id: 'p-2', quantity: 2 },
    ];
    wrap(<PodProductsField value={value} onChange={onChange} products={PRODUCTS} />);
    await settle();

    fireEvent.click(screen.getAllByLabelText('Decrease quantity')[1]);
    expect(onChange).toHaveBeenCalledWith([
      { product_id: 'p-1', quantity: 1 },
      { product_id: 'p-2', quantity: 1 },
    ]);
  });

  it('removes exactly the row whose bin was pressed', async () => {
    const onChange = vi.fn();
    const value: PodProductRequestValue[] = [
      { product_id: 'p-1', quantity: 1 },
      { product_id: 'p-2', quantity: 2 },
    ];
    wrap(<PodProductsField value={value} onChange={onChange} products={PRODUCTS} />);
    await settle();

    fireEvent.click(screen.getAllByLabelText('Remove product')[0]);
    expect(onChange).toHaveBeenCalledWith([{ product_id: 'p-2', quantity: 2 }]);
  });

  it('a row whose product left the catalogue renders no row and prices as zero', async () => {
    const value: PodProductRequestValue[] = [{ product_id: 'DUN-PRD-GONE', quantity: 5 }];
    wrap(<PodProductsField value={value} onChange={vi.fn()} products={PRODUCTS} />);
    await settle();

    expect(screen.queryByLabelText('Remove product')).toBeNull();
    expect(document.body.textContent).toContain(`Total: ${formatMoney(0)}`);
  });

  it('shows the placeholder icon when an attached product ships no image', async () => {
    const bare = [product({ id: 'p-3', product_name: 'Plain Cones', image_url: '', images: [] })];
    wrap(
      <PodProductsField
        value={[{ product_id: 'p-3', quantity: 1 }]}
        onChange={vi.fn()}
        products={bare}
      />
    );
    await settle();

    expect(document.body.querySelector('[data-testid="ImageNotSupportedIcon"]')).not.toBeNull();
  });

  it('a pick made in the dialog is appended to the value and the dialog told to close', async () => {
    const onChange = vi.fn();
    const value: PodProductRequestValue[] = [{ product_id: 'p-2', quantity: 2 }];
    wrap(<PodProductsField value={value} onChange={onChange} products={PRODUCTS} />);
    await settle();

    fireEvent.click(screen.getByText('Add a Product'));
    await settle();
    fireEvent.click(screen.getAllByText('Yonex Shuttlecock Tube')[0]);
    await settle();
    fireEvent.click(screen.getByText('Add to pod'));
    await settle();

    expect(onChange).toHaveBeenCalledWith([
      { product_id: 'p-2', quantity: 2 },
      { product_id: 'p-1', quantity: 1 },
    ]);
  });
});
