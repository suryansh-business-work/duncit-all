/**
 * The dialog's working flows: the selection gate saying no, the filter bar
 * narrowing (and un-narrowing) the grid, and the quantity stepper reporting a
 * real pick upward. These are the paths a host actually walks — the smoke suite
 * only proves the dialog mounts.
 */
import type { ReactElement } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodProductDialog from '../src/PodProductDialog';
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
  product({
    id: 'p-2',
    product_name: 'Li-Ning Grip Tape',
    unit_cost: 120,
    available_count: 0,
    brand_name: 'Li-Ning',
    sku: 'LN-GT-01',
  }),
];

const wrap = (ui: ReactElement) => render(<MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('PodProductDialog flows', () => {
  it('refuses to add with nothing picked, and says why instead of swallowing the click', async () => {
    const onAdd = vi.fn();
    wrap(<PodProductDialog open onClose={vi.fn()} products={PRODUCTS} addedIds={[]} onAdd={onAdd} />);
    await settle();

    fireEvent.click(screen.getByText('Add to pod'));
    await settle();

    expect(onAdd).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Please select a product to continue.');
  });

  it('a search that matches nothing shows the empty-search state, and Clear filters undoes it', async () => {
    wrap(<PodProductDialog open onClose={vi.fn()} products={PRODUCTS} addedIds={[]} onAdd={vi.fn()} />);
    await settle();

    fireEvent.change(screen.getByLabelText('Search products, brands or SKU'), {
      target: { value: 'carbon racket nobody stocks' },
    });
    await settle();

    expect(document.body.textContent).toContain('No products match your search.');
    expect(document.body.textContent).toContain('0 products');
    expect(document.body.textContent).toContain('1 active');

    fireEvent.click(screen.getByText('Clear filters'));
    await settle();

    expect(document.body.textContent).toContain('2 products');
    expect(document.body.textContent).toContain('Yonex Shuttlecock Tube');
    expect(screen.queryByText('1 active')).toBeNull();
  });

  it('picking a card enables the stepper, and Add reports the stepped quantity', async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    wrap(<PodProductDialog open onClose={onClose} products={PRODUCTS} addedIds={[]} onAdd={onAdd} />);
    await settle();

    fireEvent.click(screen.getAllByText('Yonex Shuttlecock Tube')[0]);
    await settle();

    expect(document.body.textContent).toContain(`Total: ${formatMoney(450)}`);

    fireEvent.click(screen.getByLabelText('Increase quantity'));
    await settle();
    expect(document.body.textContent).toContain(`Total: ${formatMoney(900)}`);

    fireEvent.click(screen.getByLabelText('Decrease quantity'));
    await settle();
    expect(document.body.textContent).toContain(`Total: ${formatMoney(450)}`);

    fireEvent.click(screen.getByText('Add to pod'));
    await settle();

    expect(onAdd).toHaveBeenCalledWith('p-1', 1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('brand, sort and stock filters each narrow the grid', async () => {
    wrap(<PodProductDialog open onClose={vi.fn()} products={PRODUCTS} addedIds={[]} onAdd={vi.fn()} />);
    await settle();

    // Brand → Li-Ning hides the Yonex product.
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Brand' }));
    await settle();
    fireEvent.click(screen.getByRole('option', { name: 'Li-Ning' }));
    await settle();
    expect(document.body.textContent).toContain('1 products');
    expect(screen.queryByText('Yonex Shuttlecock Tube')).toBeNull();
    expect(document.body.textContent).toContain('1 active');

    // All brands brings it back.
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Brand' }));
    await settle();
    fireEvent.click(screen.getByRole('option', { name: 'All brands' }));
    await settle();
    expect(document.body.textContent).toContain('2 products');

    // Price high → the ₹450 tube sorts ahead of the ₹120 tape.
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Sort' }));
    await settle();
    fireEvent.click(screen.getByRole('option', { name: 'Price: high to low' }));
    await settle();
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Yonex Shuttlecock Tube')).toBeLessThan(text.indexOf('Li-Ning Grip Tape'));

    // In stock only hides the zero-stock tape.
    fireEvent.click(screen.getByRole('checkbox', { name: 'In stock only' }));
    await settle();
    expect(document.body.textContent).toContain('1 products');
    expect(screen.queryByText('Li-Ning Grip Tape')).toBeNull();
    expect(document.body.textContent).toContain('2 active');
  });
});
