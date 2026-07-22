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
  category_id: 'c-1',
  super_category_id: null,
  sub_category_id: null,
  created_at: null,
  ...over,
});

const price = (amount: number) => `Rs ${amount}`;

describe('ShopProductCard', () => {
  it('renders name, brand and formatted price', () => {
    render(<ShopProductCard product={baseProduct()} priceFormat={price} onOpen={vi.fn()} />);
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Rs 4999')).toBeInTheDocument();
  });

  it('renders the product image from image_url', () => {
    render(<ShopProductCard product={baseProduct()} priceFormat={price} onOpen={vi.fn()} />);
    const img = screen.getByAltText('Wireless Headphones') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.test/head.jpg');
  });

  it('falls back to images[0] when image_url is absent', () => {
    render(
      <ShopProductCard
        product={baseProduct({ image_url: null, images: ['https://img.test/alt.jpg'] })}
        priceFormat={price}
        onOpen={vi.fn()}
      />,
    );
    const img = screen.getByAltText('Wireless Headphones') as HTMLImageElement;
    expect(img).toHaveAttribute('src', 'https://img.test/alt.jpg');
  });

  it('renders no image when neither image_url nor images are present', () => {
    const { container } = render(
      <ShopProductCard
        product={baseProduct({ image_url: null, images: [] })}
        priceFormat={price}
        onOpen={vi.fn()}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('omits the brand line when brand_name is absent', () => {
    render(
      <ShopProductCard
        product={baseProduct({ brand_name: null })}
        priceFormat={price}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  it('fires onOpen with the product id when the card is clicked', () => {
    const onOpen = vi.fn();
    render(<ShopProductCard product={baseProduct()} priceFormat={price} onOpen={onOpen} />);
    fireEvent.click(screen.getByLabelText('View Wireless Headphones'));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith('p-1');
  });
});
