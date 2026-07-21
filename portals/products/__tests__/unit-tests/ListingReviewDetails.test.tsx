import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ListingReviewDetails from '../../src/pages/ecomm/ListingReviewDetails';
import { deliveryTargetLabel } from '../../src/pages/ecomm/deliveryTarget';
import type { ProductListingRow } from '../../src/pages/ecomm/requestsQueries';
import { renderWithProviders } from '../testkit';

const baseRow: ProductListingRow = {
  id: 'p1',
  product_name: 'Hoodie',
  image_url: 'http://x/main.jpg',
  images: ['http://x/main.jpg', 'http://x/side.jpg'],
  description: 'Cozy fleece hoodie for winter pods.',
  brand_name: 'Acme Wear',
  inventory_count: 10,
  unit_cost: 500,
  commission_pct: 15,
  delivery_target: 'SHIPROCKET',
  listing_review_status: 'PENDING',
  listing_review_notes: null,
  listing_submitted_by_name: 'Ravi',
  is_duncit_delivery_partner: true,
  size_label: 'M',
  height_cm: 4,
  weight_kg: 0.5,
  color: 'Blue',
  options: [
    { name: 'Size', values: ['S', 'L'] },
    { name: 'Colour', values: ['Red', 'Blue'] },
  ],
  variants: [
    {
      id: 'v1',
      option_label: 'S / Red',
      sku: 'HD-S-RED',
      unit_cost: 500,
      inventory_count: 4,
      images: ['http://x/red1.jpg', 'http://x/red2.jpg', 'http://x/red3.jpg', 'http://x/red4.jpg'],
      color: 'Red',
      size_label: 'S',
      weight_kg: 0.4,
    },
    {
      id: 'v2',
      option_label: '',
      sku: 'HD-L-BLUE',
      unit_cost: 650,
      inventory_count: 6,
      images: [],
      color: 'Blue',
      size_label: 'L',
      weight_kg: 0.5,
    },
    // Legacy row with no labels or image list at all → 'Default' + no thumbs.
    {
      id: 'v3',
      option_label: '',
      sku: 'HD-PLAIN',
      unit_cost: 480,
      inventory_count: 1,
      images: undefined as unknown as string[],
      color: null,
      size_label: null,
      weight_kg: 0.3,
    },
  ],
  created_at: null,
};

describe('ListingReviewDetails', () => {
  it('shows the complete submission: gallery, description, options and the variant matrix', () => {
    renderWithProviders(<ListingReviewDetails row={baseRow} />);
    expect(screen.getByText(/Ravi · Acme Wear · 10 units · ₹500/)).toBeInTheDocument();
    expect(screen.getAllByAltText('Hoodie')).toHaveLength(2);
    expect(screen.getByText('Cozy fleece hoodie for winter pods.')).toBeInTheDocument();
    expect(screen.getByText('Size: S, L')).toBeInTheDocument();
    expect(screen.getByText('Colour: Red, Blue')).toBeInTheDocument();
    // Variant rows: label (falling back to size), SKU, price, stock, weight.
    expect(screen.getByText('S / Red')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('HD-S-RED')).toBeInTheDocument();
    expect(screen.getByText('₹650')).toBeInTheDocument();
    expect(screen.getByText('0.4 kg')).toBeInTheDocument();
    // Variant image strip caps at 3 thumbnails.
    expect(screen.getAllByAltText('S / Red')).toHaveLength(3);
    // A row with no labels at all falls back to 'Default'.
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('HD-PLAIN')).toBeInTheDocument();
  });

  it('falls back to the flat fields for a variant-less legacy listing', () => {
    renderWithProviders(
      <ListingReviewDetails
        row={{
          ...baseRow,
          brand_name: null,
          listing_submitted_by_name: null,
          description: null,
          images: [],
          image_url: 'http://x/only.jpg',
          options: [],
          variants: [],
        }}
      />,
    );
    expect(screen.getByText(/Partner · 10 units/)).toBeInTheDocument();
    expect(screen.getAllByAltText('Hoodie')).toHaveLength(1);
    expect(screen.getByText(/M · Blue · 4cm · 0.5kg/)).toBeInTheDocument();
  });

  it('renders no gallery at all when the listing has no images anywhere', () => {
    renderWithProviders(
      <ListingReviewDetails
        row={{ ...baseRow, images: [], image_url: null, options: [], variants: [] }}
      />,
    );
    expect(screen.queryByAltText('Hoodie')).not.toBeInTheDocument();
  });

  it('deliveryTargetLabel covers the undefined fallback', () => {
    expect(deliveryTargetLabel(undefined)).toBeTruthy();
  });
});
