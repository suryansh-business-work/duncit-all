import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ShopProductCard from '../ShopProductCard';
import type { ShopProduct } from '../queries';

const baseProduct = (over: Partial<ShopProduct> = {}): ShopProduct => ({
  id: 'p-1',
  product_name: 'Wireless Headphones',
  brand_name: 'Acme',
  image_url: 'https://img.test/head.jpg',
  images: [],
  unit_cost: 4999,
  available_count: 5,
  category_id: 'c-1',
  super_category_id: null,
  sub_category_id: null,
  created_at: null,
  ...over,
});

const price = (amount: number) => `Rs ${amount}`;

function renderCard(
  props: {
    product?: Partial<ShopProduct>;
    adding?: boolean;
    onOpen?: (id: string) => void;
    onQuickAdd?: (product: ShopProduct) => void;
  } = {},
) {
  const { product, ...rest } = props;
  return render(
    <ShopProductCard
      product={baseProduct(product)}
      priceFormat={price}
      adding={false}
      onOpen={vi.fn()}
      onQuickAdd={vi.fn()}
      {...rest}
    />,
  );
}

describe('ShopProductCard', () => {
  it('renders name, brand and formatted price', () => {
    renderCard();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Rs 4999')).toBeInTheDocument();
  });

  it('renders the product image from image_url', () => {
    renderCard();
    const img = screen.getByAltText('Wireless Headphones') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.test/head.jpg');
  });

  it('falls back to images[0] when image_url is absent', () => {
    renderCard({ product: { image_url: null, images: ['https://img.test/alt.jpg'] } });
    const img = screen.getByAltText('Wireless Headphones') as HTMLImageElement;
    expect(img).toHaveAttribute('src', 'https://img.test/alt.jpg');
  });

  it('renders no image when neither image_url nor images are present', () => {
    const { container } = renderCard({ product: { image_url: null, images: [] } });
    expect(container.querySelector('img')).toBeNull();
  });

  it('omits the brand line when brand_name is absent', () => {
    renderCard({ product: { brand_name: null } });
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  it('fires onOpen with the product id when the card is clicked', () => {
    const onOpen = vi.fn();
    renderCard({ onOpen });
    fireEvent.click(screen.getByLabelText('View Wireless Headphones'));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith('p-1');
  });

  it('quick-adds to cart without opening the product', () => {
    const onOpen = vi.fn();
    const onQuickAdd = vi.fn();
    renderCard({ onOpen, onQuickAdd });
    fireEvent.click(screen.getByLabelText('Add Wireless Headphones to cart'));
    expect(onQuickAdd).toHaveBeenCalledOnce();
    expect(onQuickAdd.mock.calls[0][0].id).toBe('p-1');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows a spinner and disables the button while adding', () => {
    renderCard({ adding: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Wireless Headphones to cart')).toBeDisabled();
  });

  it('shows "Out of stock" and no add button when unavailable', () => {
    renderCard({ product: { available_count: 0 } });
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add Wireless Headphones to cart')).not.toBeInTheDocument();
  });
});
