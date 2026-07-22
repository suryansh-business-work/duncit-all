import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import ProductDetailDialog from '../ProductDetailDialog';
import { PUBLIC_PRODUCT, RECORD_PRODUCT_CLICK, RECORD_PRODUCT_VIEW } from '../queries';

// Stub the query/side-effecting children so this test stays focused on the
// dialog itself. Each stub surfaces the prop the dialog wires into it.
vi.mock('../ProductReviews', () => ({
  default: ({ productId }: { productId: string }) => (
    <div data-testid="reviews">{productId}</div>
  ),
}));
vi.mock('../../../components/moments/MomentLightbox', () => ({
  default: ({ index }: { index: number | null }) => (
    <div data-testid="lightbox">{index === null ? 'closed' : `open-${index}`}</div>
  ),
}));
vi.mock('../BrandDetailDialog', () => ({
  default: ({ brandId }: { brandId: string | null }) => (
    <div data-testid="brand-dialog">{brandId ?? 'none'}</div>
  ),
}));

const PRODUCT_ID = 'prod1';

const product = {
  id: PRODUCT_ID,
  product_name: 'Cool Mug',
  brand_id: 'brand1',
  brand_name: 'MugCo',
  short_description: 'short desc',
  description: 'A very cool mug',
  image_url: 'img0',
  images: ['imgA', 'imgB'],
  size_label: 'M',
  color: 'Blue',
  height_cm: 10,
  length_cm: 5,
  breadth_cm: 3,
  weight_kg: 0.5,
  unit_cost: 100,
  selling_price: 150,
  variants: [
    {
      id: 'var1',
      option_label: 'Red',
      color: 'Red',
      size_label: 'M',
      unit_cost: 120,
      inventory_count: 5,
      images: ['vimg1'],
    },
    {
      id: 'var2',
      option_label: 'Green',
      color: 'Green',
      size_label: 'L',
      unit_cost: 130,
      inventory_count: 0,
      images: [],
    },
  ],
};

const viewMock = (): MockedResponse => ({
  request: { query: RECORD_PRODUCT_VIEW, variables: { id: PRODUCT_ID } },
  result: { data: { recordProductView: true } },
});
const clickMock = (): MockedResponse => ({
  request: { query: RECORD_PRODUCT_CLICK, variables: { id: PRODUCT_ID } },
  result: { data: { recordProductClick: true } },
});
const variantClickMock = (variant_id: string): MockedResponse => ({
  request: { query: RECORD_PRODUCT_CLICK, variables: { id: PRODUCT_ID, variant_id } },
  result: { data: { recordProductClick: true } },
});
const productMock = (data: unknown = product): MockedResponse => ({
  request: { query: PUBLIC_PRODUCT, variables: { id: PRODUCT_ID } },
  result: { data: { publicInventoryProduct: data } },
});

function renderDialog(
  mocks: MockedResponse[],
  props: Partial<React.ComponentProps<typeof ProductDetailDialog>> = {},
) {
  const onClose = vi.fn();
  const onUpdateLine = vi.fn();
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ProductDetailDialog
        productId={PRODUCT_ID}
        onClose={onClose}
        onUpdateLine={onUpdateLine}
        maxQuantity={10}
        {...props}
      />
    </MockedProvider>,
  );
  return { onClose, onUpdateLine };
}

describe('ProductDetailDialog', () => {
  it('renders nothing-open when productId is null and skips tracking', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <ProductDetailDialog productId={null} onClose={vi.fn()} />
      </MockedProvider>,
    );
    expect(screen.queryByText('Product details')).not.toBeInTheDocument();
  });

  it('shows a loading spinner before the product resolves', () => {
    renderDialog([viewMock(), clickMock(), productMock()]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error alert when the product query fails', async () => {
    render(
      <MockedProvider
        mocks={[
          viewMock(),
          clickMock(),
          {
            request: { query: PUBLIC_PRODUCT, variables: { id: PRODUCT_ID } },
            error: new Error('boom'),
          },
        ]}
        addTypename={false}
      >
        <ProductDetailDialog productId={PRODUCT_ID} onClose={vi.fn()} />
      </MockedProvider>,
    );
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('renders product details, price, mrp, specs, variants and brand link', async () => {
    renderDialog([viewMock(), clickMock(), productMock()]);
    expect(await screen.findByText('Cool Mug')).toBeInTheDocument();
    // default variant is var1 → unit_cost 120; mrp 150 shown struck-through
    expect(screen.getByText('₹120')).toBeInTheDocument();
    expect(screen.getByText('₹150')).toBeInTheDocument();
    expect(screen.getByText('A very cool mug')).toBeInTheDocument();
    // spec rows
    expect(screen.getByText('Dimensions')).toBeInTheDocument();
    expect(screen.getByText('5 × 3 × 10 cm')).toBeInTheDocument();
    // brand link (has brand_id → button)
    expect(screen.getByRole('button', { name: /by MugCo/i })).toBeInTheDocument();
    // reviews child gets the product id
    expect(screen.getByTestId('reviews')).toHaveTextContent(PRODUCT_ID);
  });

  it('opens the brand dialog when the brand link is clicked', async () => {
    renderDialog([viewMock(), clickMock(), productMock()]);
    await screen.findByText('Cool Mug');
    expect(screen.getByTestId('brand-dialog')).toHaveTextContent('none');
    fireEvent.click(screen.getByRole('button', { name: /by MugCo/i }));
    expect(screen.getByTestId('brand-dialog')).toHaveTextContent('brand1');
  });

  it('opens the lightbox when a gallery image is zoomed', async () => {
    renderDialog([viewMock(), clickMock(), productMock()]);
    await screen.findByText('Cool Mug');
    expect(screen.getByTestId('lightbox')).toHaveTextContent('closed');
    fireEvent.click(screen.getAllByRole('button', { name: /zoom image/i })[0]);
    expect(screen.getByTestId('lightbox')).toHaveTextContent('open-0');
  });

  it('selects a variant chip and records the variant click', async () => {
    renderDialog([viewMock(), clickMock(), productMock(), variantClickMock('var2')]);
    await screen.findByText('Cool Mug');
    fireEvent.click(screen.getByRole('button', { name: 'Green' }));
    // var2 unit_cost 130 becomes the shown price
    await waitFor(() => expect(screen.getByText('₹130')).toBeInTheDocument());
  });

  it('adds the active variant to the selection via the quantity bar', async () => {
    const { onUpdateLine } = renderDialog([viewMock(), clickMock(), productMock()]);
    await screen.findByText('Cool Mug');
    fireEvent.click(screen.getByRole('button', { name: /add to selection/i }));
    expect(onUpdateLine).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ id: 'var1', label: 'Red', unit_cost: 120, max: 5 }),
    );
  });

  it('shows quantity controls when a line is already selected', async () => {
    const { onUpdateLine } = renderDialog([viewMock(), clickMock(), productMock()], {
      selection: { 'prod1::var1': 2 },
    });
    await screen.findByText('Cool Mug');
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(onUpdateLine).toHaveBeenCalledWith(3, expect.objectContaining({ id: 'var1' }));
  });

  it('hides the quantity bar in viewOnly mode', async () => {
    renderDialog([viewMock(), clickMock(), productMock()], { viewOnly: true });
    await screen.findByText('Cool Mug');
    expect(screen.queryByRole('button', { name: /add to selection/i })).not.toBeInTheDocument();
  });

  it('renders a plain brand label (no link) and no-description fallback', async () => {
    const bare = {
      id: PRODUCT_ID,
      product_name: 'Bare Item',
      brand_id: null,
      brand_name: 'PlainBrand',
      short_description: '',
      description: '',
      image_url: '',
      images: [],
      size_label: null,
      color: null,
      height_cm: 0,
      length_cm: 0,
      breadth_cm: 0,
      weight_kg: 0,
      unit_cost: 80,
      selling_price: 0,
      variants: [],
    };
    renderDialog([viewMock(), clickMock(), productMock(bare)]);
    await screen.findByText('Bare Item');
    expect(screen.getByText('by PlainBrand')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /by PlainBrand/i })).not.toBeInTheDocument();
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
    expect(screen.getByText('₹80')).toBeInTheDocument();
  });

  it('closes via the close button', async () => {
    const { onClose } = renderDialog([viewMock(), clickMock(), productMock()]);
    await screen.findByText('Cool Mug');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
