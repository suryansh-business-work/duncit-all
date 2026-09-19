import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatINR } from '@duncit/utils';
import ListProductsPreview from './ListProductsPreview';
import { emptyValues, emptyVariant } from './list-products.map';
import type { ProductListingValues } from './list-products.types';
import { warehouseRow, warehousesMock } from '../../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const values = (over: Partial<ProductListingValues> = {}): ProductListingValues => ({
  ...emptyValues,
  product_name: 'Alpha Tee',
  categories: [
    {
      super_id: 's1',
      super_name: 'Apparel',
      category_id: 'c1',
      category_name: 'Tops',
      sub_id: 'sc1',
      sub_name: 'T-shirts',
    },
  ],
  variants: [
    {
      ...emptyVariant,
      option_label: 'M / Blue',
      option_values: [
        { name: 'Size', value: 'M' },
        { name: 'Colour', value: 'Blue' },
      ],
      image_urls: ['https://cdn.test/alpha-m.jpg'],
      unit_cost: 499,
      inventory_count: 12,
      length_cm: 30,
      breadth_cm: 25,
      height_cm: 2,
      weight_kg: 0.3,
    },
    {
      ...emptyVariant,
      option_label: 'Gift wrap',
      unit_cost: '549',
      inventory_count: '3',
      length_cm: '30',
      breadth_cm: '25',
      height_cm: '4',
      weight_kg: '0.4',
    },
  ],
  commission_pct: 18,
  pickup_location_id: 'w2',
  free_delivery_above: 999,
  ...over,
});

const renderPreview = (formValues: ProductListingValues, mocks: MockedResponse[] = [], brandId = 'b1') =>
  renderWithProviders(<ListProductsPreview values={formValues} brandId={brandId} />, { mocks });

const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map((cell) => cell.textContent);

describe('ListProductsPreview', () => {
  it('summarises the listing: name, category path, each variant, commission and stock', () => {
    renderPreview(values());

    expect(screen.getByRole('heading', { name: 'Alpha Tee' })).toBeTruthy();
    expect(screen.getByText('Apparel › Tops › T-shirts')).toBeTruthy();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(cells(rows[1])).toEqual(['M / Blue', formatINR(499), '12', '30 × 25 × 2 cm · 0.3 kg']);
    expect(cells(rows[2])).toEqual(['Gift wrap', formatINR(549), '3', '30 × 25 × 4 cm · 0.4 kg']);
    expect(screen.getByText(/Commission:/).parentElement?.textContent).toBe('Commission: 18% · Total stock: 15');
  });

  it('names the ship-from warehouse and the free-delivery offer', async () => {
    renderPreview(values(), [
      warehousesMock([
        warehouseRow(),
        warehouseRow({ id: 'w2', nickname: 'Pune hub', city: 'Pune', is_default: false }),
      ]),
    ]);

    expect((await screen.findByText(/from Pune hub/)).textContent).toBe('Delivery: ShipRocket · from Pune hub (Pune)');
    expect(screen.getByText(`Free delivery on orders of ${formatINR(999)} or more`)).toBeTruthy();
  });

  it('falls back to placeholders for a listing still being filled in', () => {
    renderPreview(
      values({
        product_name: '',
        categories: [
          { super_id: '', super_name: '', category_id: '', category_name: '', sub_id: '', sub_name: '' },
        ],
        variants: [{ ...emptyVariant }],
        free_delivery_above: '',
        pickup_location_id: '',
      }),
      [],
      '',
    );

    expect(screen.getByRole('heading', { name: 'Product preview' })).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
    const rows = screen.getAllByRole('row');
    expect(cells(rows[1])).toEqual(['Default', formatINR(0), '0', '0 × 0 × 0 cm · 0 kg']);
    expect(screen.getByText(/Commission:/).parentElement?.textContent).toBe('Commission: 15% · Total stock: 0');
    expect(screen.getByText(/Delivery:/).parentElement?.textContent).toBe('Delivery: ShipRocket');
    expect(screen.getByText('No free-delivery offer')).toBeTruthy();
  });

  it('keeps unnamed variants apart when they differ only by price or image', () => {
    renderPreview(
      values({
        variants: [
          { ...emptyVariant, size_label: 'M', unit_cost: 499, inventory_count: 1, image_urls: ['https://cdn.test/a.jpg'] },
          { ...emptyVariant, size_label: 'M', unit_cost: 499, inventory_count: 2 },
        ],
      }),
    );

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(cells(rows[1])[2]).toBe('1');
    expect(cells(rows[2])[2]).toBe('2');
  });
});
