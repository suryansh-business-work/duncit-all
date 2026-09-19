import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import ProductDetailView from './ProductDetailView';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

/** A listing as myProductListings returns it (the fields the detail page reads). */
const product = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  product_name: 'Alpha Tee',
  description: 'Soft cotton tee for weekend pods.',
  listing_review_status: 'APPROVED',
  listing_review_notes: 'Great photos.',
  delivery_target: 'SHIPROCKET',
  commission_pct: 12,
  categories: [
    {
      super_category_id: 's1',
      category_id: 'c1',
      sub_category_id: 'sc1',
      super_category_name: 'Apparel',
      category_name: 'Tops',
      sub_category_name: 'T-shirts',
    },
  ],
  variants: [
    {
      option_label: 'M / Blue',
      option_values: [
        { name: 'Size', value: 'M' },
        { name: 'Colour', value: 'Blue' },
      ],
      color: 'Blue',
      size_label: 'M',
      description: 'Relaxed fit.',
      unit_cost: 499,
      inventory_count: 12,
      images: ['https://cdn.test/alpha-m-1.jpg', 'https://cdn.test/alpha-m-2.jpg'],
      height_cm: 2,
      breadth_cm: 25,
      length_cm: 30,
      weight_kg: 0.3,
    },
    {
      option_label: '',
      option_values: [],
      color: '',
      size_label: '',
      description: '',
      unit_cost: 0,
      inventory_count: 0,
      images: [],
      height_cm: 0,
      breadth_cm: 0,
      length_cm: 0,
      weight_kg: 0,
    },
  ],
  ...over,
});

const variantCard = (title: string) => screen.getByRole('heading', { name: title }).closest('.MuiCard-root') as HTMLElement;

describe('ProductDetailView', () => {
  it('heads the card with the product, its review status and category path', () => {
    renderWithProviders(<ProductDetailView product={product()} />);

    expect(screen.getByRole('heading', { name: 'Alpha Tee' })).toBeTruthy();
    expect(screen.getByText('APPROVED')).toBeTruthy();
    expect(screen.getByText('Apparel › Tops › T-shirts')).toBeTruthy();
    expect(screen.getByText('Soft cotton tee for weekend pods.')).toBeTruthy();
    expect(screen.getByText(/Delivery: ShipRocket · Commission:/).textContent).toBe('Delivery: ShipRocket · Commission: 12%');
    expect(screen.getByText('Review notes: Great photos.')).toBeTruthy();
  });

  it('describes each variant with its images, price, stock, size and dimensions', () => {
    renderWithProviders(<ProductDetailView product={product()} />);

    expect(screen.getByRole('heading', { name: 'Variants (2)' })).toBeTruthy();
    const full = variantCard('M / Blue');
    expect(within(full).getAllByRole('img', { name: 'Variant' })).toHaveLength(2);
    expect(within(full).getByText('Relaxed fit.')).toBeTruthy();
    expect(within(full).getByText(`${inr.format(499)} · 12 in stock · Size M`)).toBeTruthy();
    expect(within(full).getByText('30 × 25 × 2 cm · 0.3 kg')).toBeTruthy();
  });

  it('numbers an unnamed variant and zeroes its missing figures', () => {
    renderWithProviders(<ProductDetailView product={product()} />);

    const bare = variantCard('Variant 2');
    expect(within(bare).queryByRole('img')).toBeNull();
    expect(within(bare).getByText(`${inr.format(0)} · 0 in stock`)).toBeTruthy();
    expect(within(bare).getByText('0 × 0 × 0 cm · 0 kg')).toBeTruthy();
  });

  it('falls back to category ids, then to a generic label, when names are missing', () => {
    renderWithProviders(
      <ProductDetailView
        product={product({
          categories: [
            {
              super_category_id: 's1',
              category_id: 'c1',
              sub_category_id: 'sc1',
              super_category_name: '',
              category_name: '',
              sub_category_name: '',
            },
            {
              super_category_id: null,
              category_id: null,
              sub_category_id: null,
              super_category_name: '',
              category_name: '',
              sub_category_name: '',
            },
          ],
        })}
      />,
    );

    expect(screen.getByText('s1 › c1 › sc1')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
  });

  it('keeps a legacy listing readable: no categories, variants, description or notes', () => {
    renderWithProviders(
      <ProductDetailView
        product={product({
          description: '',
          listing_review_status: 'PENDING',
          listing_review_notes: '',
          delivery_target: 'HOST',
          categories: [],
          variants: [],
        })}
      />,
    );

    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.getByText(/Delivery: HOST/).textContent).toBe('Delivery: HOST · Commission: 12%');
    expect(screen.queryByText(/Review notes/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Variants (0)' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /Variant \d/ })).toBeNull();
  });
});
