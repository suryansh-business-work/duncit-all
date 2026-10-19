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
    // The header is the section title alone — the "Products" eyebrow was dropped.
    expect(screen.getByTestId('pod-shop-header')).toHaveTextContent('Pod Shop');
    expect(screen.queryByText('Products')).not.toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    // Two named products render; the nameless p3 is filtered out.
    expect(screen.getByText('Mug')).toBeInTheDocument();
    expect(screen.getByText('Cap')).toBeInTheDocument();
    expect(screen.getByText('Available 5')).toBeInTheDocument();
    expect(screen.getByText('Available 3')).toBeInTheDocument();
  });

  it('keeps a big shop inside a capped, scrolling list on its own card', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...requestA, product_id: `p${i}`, product_name: `Item ${i}` }));
    renderPreview({ pod: makePod({ product_requests: many }) });
    expect(screen.getByText('Item 19')).toBeInTheDocument();
    expect(screen.getByTestId('pod-shop-rows')).toHaveStyle({ maxHeight: '360px', overflowY: 'auto' });
  });

  it('leaves the rows uncapped when embedded (the Pod Shop | Pod Rent card and its sheet frame them)', () => {
    renderPreview({ embedded: true });
    expect(screen.getByTestId('pod-shop-rows')).not.toHaveStyle({ maxHeight: '360px' });
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

  it('adds a product via its "+" when quantity is 0', () => {
    const { onSelectionChange } = renderPreview();
    // One "+" per (named) unselected product, each naming its product.
    expect(screen.getByTestId('pod-shop-p1-add')).toHaveAccessibleName('Add Mug');
    expect(screen.getByTestId('pod-shop-p2-add')).toHaveAccessibleName('Add Cap');
    fireEvent.click(screen.getByRole('button', { name: 'Add Mug' }));
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 1 });
  });

  it('hides the "+" when the product is sold out', () => {
    const soldOut = { product_id: 'p4', product_name: 'Poster', unit_cost: 20, available_count: 0 };
    const { onSelectionChange } = renderPreview({
      pod: makePod({ product_requests: [requestA, soldOut] }),
    });
    expect(screen.getByText('Poster')).toBeInTheDocument();
    expect(screen.getByText('Available 0')).toBeInTheDocument();
    // Only the in-stock product keeps its "+".
    expect(screen.queryByRole('button', { name: 'Add Poster' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Mug' }));
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 1 });
  });

  it('opens the "+" into the quantity pill once quantity > 0', () => {
    const { onSelectionChange } = renderPreview({ selectedProducts: { p1: 2 } });
    expect(screen.getByTestId('pod-shop-p1-qty')).toHaveTextContent('2');
    // p1 shows the pill; p2 keeps its lone "+".
    expect(screen.queryByRole('button', { name: 'Add Mug' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Cap' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Mug' })); // 2 -> 1
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Add one more Mug' })); // 2 -> 3 (< max 5)
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 3 });
  });

  it('shows a bin at one, which removes the line', () => {
    const { onSelectionChange } = renderPreview({ selectedProducts: { p1: 1 } });
    expect(screen.queryByRole('button', { name: 'Remove one Mug' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Mug' }));
    expect(onSelectionChange).toHaveBeenCalledWith({});
  });

  it('caps increment at the available maximum', () => {
    const { onSelectionChange } = renderPreview({ selectedProducts: { p1: 5 } });
    // At max (5), the "+" is disabled — a click on it is a no-op.
    // Decrement still works.
    expect(screen.getByTestId('pod-shop-p1-qty')).toHaveTextContent('5');
    const plus = screen.getByRole('button', { name: 'Add one more Mug' });
    expect(plus).toBeDisabled();
    fireEvent.click(plus);
    expect(onSelectionChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Mug' }));
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 4 });
  });

  it('says nothing for a product already in the cart, then "Item removed" when its last unit goes', () => {
    const props = { pod: makePod(), priceFormat, onSelectionChange: vi.fn() };
    const { rerender } = render(<PodCommercePreview {...props} selectedProducts={{ p1: 1 }} />);
    expect(screen.getByTestId('pod-shop-p1-notice')).toHaveTextContent('');

    rerender(<PodCommercePreview {...props} selectedProducts={{}} />);
    expect(screen.getByTestId('pod-shop-p1-notice')).toHaveTextContent('Item removed');
    // The other row's notice is its own.
    expect(screen.getByTestId('pod-shop-p2-notice')).toHaveTextContent('');

    rerender(<PodCommercePreview {...props} selectedProducts={{ p2: 1 }} />);
    expect(screen.getByTestId('pod-shop-p2-notice')).toHaveTextContent('Item added');
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
    // No cart control at all while the shop is closed — neither the "+" nor the pill.
    expect(screen.queryByRole('button', { name: 'Add Cap' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add one more Mug' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove one Mug' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-shop-p1-qty')).not.toBeInTheDocument();
    expect(screen.getByText(/shop is currently closed/i)).toBeInTheDocument();
    // Footer selection caption is hidden while the shop is closed.
    expect(screen.queryByText('Selected product total')).not.toBeInTheDocument();
    expect(screen.getByTestId('detail-viewonly')).toHaveTextContent('true');
  });

  it('stays interactive for a booked/expired viewer (add-to-cart works in any pod state)', () => {
    // products_enabled defaults to true → the shop is open regardless of membership.
    const { onSelectionChange } = renderPreview({ selectedProducts: {} });
    fireEvent.click(screen.getByRole('button', { name: 'Add Mug' }));
    expect(onSelectionChange).toHaveBeenCalledWith({ p1: 1 });
    expect(screen.getByTestId('detail-viewonly')).toHaveTextContent('false');
  });
});
