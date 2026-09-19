import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { QuantityCell, renderListingStatus, renderProduct } from './ProductListingCells';
import type { ProductListingRow } from './queries';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const row = (over: Partial<ProductListingRow> = {}): ProductListingRow => ({
  id: 'p1',
  product_name: 'Alpha Tee',
  image_url: 'https://cdn.test/alpha.jpg',
  images: ['https://cdn.test/alpha.jpg', 'https://cdn.test/alpha-2.jpg'],
  size_label: 'M',
  inventory_count: 9,
  listing_review_status: 'APPROVED',
  is_active: true,
  ...over,
});

describe('renderProduct', () => {
  it('shows the cover image, name, image count and size', () => {
    renderWithProviders(renderProduct(row()));
    expect((screen.getByAltText('Alpha Tee') as HTMLImageElement).src).toBe('https://cdn.test/alpha.jpg');
    expect(screen.getByText('2 images · M')).toBeTruthy();
  });

  it('uses the first gallery image when the listing has no cover image', () => {
    renderWithProviders(renderProduct(row({ image_url: '' })));
    expect((screen.getByAltText('Alpha Tee') as HTMLImageElement).src).toBe('https://cdn.test/alpha.jpg');
  });

  it('captions a listing with no images or size', () => {
    renderWithProviders(renderProduct(row({ image_url: '', images: [], size_label: '' })));
    expect(screen.getByText('0 images · No size')).toBeTruthy();
  });
});

describe('renderListingStatus', () => {
  it('shows the review status of a live listing', () => {
    renderWithProviders(renderListingStatus(row()));
    expect(screen.getByText('APPROVED')).toBeTruthy();
  });

  it('shows PAUSED for an approved listing the partner deactivated', () => {
    renderWithProviders(renderListingStatus(row({ is_active: false })));
    expect(screen.getByText('PAUSED')).toBeTruthy();
    expect(screen.queryByText('APPROVED')).toBeNull();
  });

  it('keeps the review status of a paused listing that is not approved', () => {
    renderWithProviders(renderListingStatus(row({ listing_review_status: 'DENIED', is_active: false })));
    expect(screen.getByText('DENIED')).toBeTruthy();
  });
});

describe('QuantityCell', () => {
  it('saves the edited quantity for its row', () => {
    const onSave = vi.fn();
    renderWithProviders(<QuantityCell product={row()} disabled={false} onSave={onSave} />);

    const input = screen.getByRole('spinbutton', { name: 'Quantity' }) as HTMLInputElement;
    expect(input.value).toBe('9');
    fireEvent.change(input, { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 14);
  });

  it('saves zero when the partner clears the field', () => {
    const onSave = vi.fn();
    renderWithProviders(<QuantityCell product={row()} disabled={false} onSave={onSave} />);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 0);
  });

  it('locks the editor while disabled', () => {
    renderWithProviders(<QuantityCell product={row()} disabled onSave={vi.fn()} />);
    expect(screen.getByRole('spinbutton', { name: 'Quantity' }).hasAttribute('disabled')).toBe(true);
    expect((screen.getByRole('button', { name: 'Update' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
