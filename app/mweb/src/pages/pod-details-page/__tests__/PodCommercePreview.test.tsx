import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PodCommercePreview from '../PodCommercePreview';

// Stub the detail dialog so this suite stays focused on the commerce preview.
// The stub surfaces the props the preview wires in and lets us drive
// onUpdateLine (with and without a variant) synchronously.
vi.mock('../ProductDetailDialog', () => ({
  default: ({ productId, onClose, onUpdateLine, viewOnly, maxQuantity }: any) => (
    <div data-testid="detail-dialog">
      <span data-testid="detail-product">{productId ?? 'none'}</span>
      <span data-testid="detail-max">{maxQuantity}</span>
      <span data-testid="detail-viewonly">{String(viewOnly)}</span>
      <button type="button" onClick={onClose}>
        close-detail
      </button>
      <button type="button" onClick={() => onUpdateLine(3, null)}>
        update-base
      </button>
      <button
        type="button"
        onClick={() =>
          onUpdateLine(2, {
            id: 'var1',
            label: 'Red',
            unit_cost: 50,
            image_url: '',
            max: 9,
          })
        }
      >
        update-variant
      </button>
    </div>
  ),
}));

const priceFormat = (amount: number) => `₹${amount}`;

const requestA = {
  product_id: 'p1',
  product_name: 'Mug',
  unit_cost: 100,
  available_count: 5,
  image_url: 'img-a',
};
const requestB = {
  product_id: 'p2',
  product_name: 'Cap',
  unit_cost: 40,
  quantity: 3,
  images: ['img-b'],
};

function makePod(overrides: Record<string, unknown> = {}) {
  return {
    products_enabled: true,
    product_requests: [requestA, requestB, { product_id: 'p3' }],
    ...overrides,
  };
}

function renderPreview(props: Partial<React.ComponentProps<typeof PodCommercePreview>> = {}) {
  const onSelectionChange = vi.fn();
  const onVariantQuantity = vi.fn();
  render(
    <PodCommercePreview
      pod={makePod()}
      priceFormat={priceFormat}
      selectedProducts={{}}
      onSelectionChange={onSelectionChange}
      onVariantQuantity={onVariantQuantity}
      {...props}
    />,
  );
  return { onSelectionChange, onVariantQuantity };
}

describe('PodCommercePreview', () => {
  it('renders the header, Available chip and filters out nameless requests', () => {
    renderPreview();
    expect(screen.getByText('Pod Shop')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    // Two named products render; the nameless p3 is filtered out.
    expect(screen.getByText('Mug')).toBeInTheDocument();
    expect(screen.getByText('Cap')).toBeInTheDocument();
    expect(screen.getByText('Available 5')).toBeInTheDocument();
    expect(screen.getByText('Available 3')).toBeInTheDocument();
  });

  it('shows a Closed chip when products are disabled', () => {
    renderPreview({ pod: makePod({ products_enabled: false }) });
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('renders the empty state when there are no named products', () => {
    renderPreview({ pod: makePod({ product_requests: [{ product_id: 'x' }] }) });
    expect(screen.getByText('No products available yet.')).toBeInTheDocument();
  });

  it('never toggles selection from a card tap (no checkbox, no row onClick)', () => {
    const { onSelectionChange } = renderPreview();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Mug'));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('adds a product via the Add to cart button when quantity is 0', () => {
    const { onSelectionChange } = renderPreview();
    // One button per (named) unselected product.
    expect(screen.getAllByRole('button', { name: /add to cart/i })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /add to cart/i })[0]);
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 1 });
  });

  it('replaces the Add to cart button with the stepper once quantity > 0', () => {
    const { onSelectionChange } = renderPreview({ selectedProducts: { p1: 2 } });
    expect(screen.getByText('2')).toBeInTheDocument();
    // p1 shows the stepper; only p2 keeps its Add to cart button.
    expect(screen.getAllByRole('button', { name: /add to cart/i })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Mug' })); // 2 -> 1
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Increase Mug' })); // 2 -> 3 (< max 5)
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 3 });
  });

  it('removes the line when the stepper decrements to zero', () => {
    const { onSelectionChange } = renderPreview({ selectedProducts: { p1: 1 } });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Mug' }));
    expect(onSelectionChange).toHaveBeenCalledWith({});
  });

  it('caps increment at the available maximum', () => {
    const { onSelectionChange } = renderPreview({ selectedProducts: { p1: 5 } });
    // At max (5), the increment button is disabled — the + click is a no-op.
    // Decrement still works.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Mug' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Mug' }));
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 4 });
  });

  it('falls back to a broken-image placeholder on image error', () => {
    renderPreview();
    const img = screen.getByAltText('Mug');
    fireEvent.error(img);
    // After the error the image is removed from the DOM.
    expect(screen.queryByAltText('Mug')).not.toBeInTheDocument();
  });

  it('opens the product detail dialog from the info icon', () => {
    renderPreview();
    expect(screen.getByTestId('detail-product')).toHaveTextContent('none');
    fireEvent.click(screen.getByRole('button', { name: /View Mug details/i }));
    expect(screen.getByTestId('detail-product')).toHaveTextContent('p1');
    // maxQuantity is derived from available_count (5).
    expect(screen.getByTestId('detail-max')).toHaveTextContent('5');
    // Close resets it.
    fireEvent.click(screen.getByRole('button', { name: 'close-detail' }));
    expect(screen.getByTestId('detail-product')).toHaveTextContent('none');
  });

  it('routes a base-line update from the dialog through onSelectionChange', () => {
    const { onSelectionChange, onVariantQuantity } = renderPreview();
    fireEvent.click(screen.getByRole('button', { name: /View Mug details/i }));
    fireEvent.click(screen.getByRole('button', { name: 'update-base' }));
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 3 });
    expect(onVariantQuantity).not.toHaveBeenCalled();
  });

  it('routes a variant-line update from the dialog through onVariantQuantity', () => {
    const { onVariantQuantity, onSelectionChange } = renderPreview();
    fireEvent.click(screen.getByRole('button', { name: /View Cap details/i }));
    fireEvent.click(screen.getByRole('button', { name: 'update-variant' }));
    expect(onVariantQuantity).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: 'p2' }),
      expect.objectContaining({ id: 'var1' }),
      2,
    );
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('shows the neutral footer caption and base total when nothing is selected', () => {
    renderPreview();
    expect(screen.getByText('Selected product total')).toBeInTheDocument();
    expect(screen.getByText('₹0')).toBeInTheDocument();
  });

  it('shows the singular product count and a computed base total', () => {
    renderPreview({ selectedProducts: { p1: 2 } });
    expect(screen.getByText('1 product selected')).toBeInTheDocument();
    // baseTotal = 2 * 100 = 200
    expect(screen.getByText('₹200')).toBeInTheDocument();
  });

  it('pluralises the product count and prefers the variant-aware selectedTotal', () => {
    renderPreview({ selectedProducts: { p1: 1, p2: 1 }, selectedTotal: 999 });
    expect(screen.getByText('2 products selected')).toBeInTheDocument();
    expect(screen.getByText('₹999')).toBeInTheDocument();
  });

  it('goes read-only with a shop-closed notice when products are disabled', () => {
    renderPreview({ pod: makePod({ products_enabled: false }), selectedProducts: { p1: 2 } });
    // No Add to cart buttons and no steppers while the shop is closed.
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Increase Mug' })).not.toBeInTheDocument();
    expect(screen.getByText(/shop is currently closed/i)).toBeInTheDocument();
    // Footer selection caption is hidden while the shop is closed.
    expect(screen.queryByText('Selected product total')).not.toBeInTheDocument();
    expect(screen.getByTestId('detail-viewonly')).toHaveTextContent('true');
  });

  it('stays interactive for a booked/expired viewer (add-to-cart works in any pod state)', () => {
    // products_enabled defaults to true → the shop is open regardless of membership.
    const { onSelectionChange } = renderPreview({ selectedProducts: {} });
    fireEvent.click(screen.getAllByRole('button', { name: /add to cart/i })[0]);
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 1 });
    expect(screen.getByTestId('detail-viewonly')).toHaveTextContent('false');
  });
});
