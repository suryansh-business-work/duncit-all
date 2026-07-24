import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InMemoryCache } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductDetailPage, { PODS_FOR_PRODUCT } from '../ProductDetailPage';
import { PUBLIC_PRODUCT, PRODUCT_REVIEWS, PUBLIC_BRAND } from '../pod-details-page/queries';
import { CartProvider } from '../../components/cart/CartContext';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const PRODUCT_ID = 'prod-1';

const fullProduct = {
  id: PRODUCT_ID,
  product_name: 'Yoga Mat',
  brand_id: 'brand-1',
  brand_name: 'FitCo',
  short_description: 'Short desc',
  description: 'A premium non-slip yoga mat.',
  image_url: 'https://img/base.jpg',
  images: ['https://img/base1.jpg', 'https://img/base2.jpg'],
  size_label: 'M',
  color: 'Blue',
  height_cm: 2,
  length_cm: 180,
  breadth_cm: 60,
  weight_kg: 1.2,
  unit_cost: 1499,
  selling_price: 1799,
  variants: [
    {
      id: 'var-1',
      option_label: 'Blue / M',
      color: 'Blue',
      size_label: 'M',
      unit_cost: 1499,
      inventory_count: 10,
      images: ['https://img/var1.jpg'],
    },
    {
      id: 'var-2',
      option_label: 'Red / L',
      color: 'Red',
      size_label: 'L',
      unit_cost: 1999,
      inventory_count: 3,
      images: [],
    },
  ],
};

const reviewsMock = {
  request: { query: PRODUCT_REVIEWS, variables: { id: PRODUCT_ID } },
  result: {
    data: {
      productReviewSummary: { average_rating: 0, total: 0, star_counts: [] },
      productReviews: [],
    },
  },
};

const brandMock = {
  request: { query: PUBLIC_BRAND, variables: { id: 'brand-1' } },
  result: {
    data: {
      publicEcommBrand: {
        id: 'brand-1',
        brand_name: 'FitCo',
        logo_url: null,
        cover_image_url: null,
        tagline: 'Move better',
        description: 'Sports gear brand',
        website_url: null,
        instagram_url: null,
        product_categories: [],
        established_year: 2019,
        city: 'Pune',
        state: 'MH',
        approved_product_count: 12,
      },
    },
  },
};

/**
 * The page computes `productSpecs(product)` *before* its loading/error/null
 * guards, so it only renders when the product is already present. In real use
 * that is guaranteed by the cache-first fetch policy (navigated from a cached
 * browse list). We reproduce that here by pre-seeding the Apollo cache, which
 * makes useQuery return the product synchronously with loading=false.
 */
function renderPage(product: unknown, mocks: readonly unknown[], pods: unknown[] = []) {
  const cache = new InMemoryCache({ addTypename: false });
  cache.writeQuery({
    query: PUBLIC_PRODUCT,
    variables: { id: PRODUCT_ID },
    data: { publicInventoryProduct: product },
  });
  const podsMock = {
    request: { query: PODS_FOR_PRODUCT, variables: { id: PRODUCT_ID } },
    result: { data: { podsForProduct: pods } },
  };
  return render(
    <MockedProvider
      mocks={[...mocks, podsMock, podsMock] as never}
      addTypename={false}
      cache={cache}
    >
      <CartProvider>
        <MemoryRouter initialEntries={[`/product/${PRODUCT_ID}`]}>
          <Routes>
            <Route path="/product/:productId" element={<ProductDetailPage />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </MockedProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe('ProductDetailPage', () => {
  it('renders the populated product with price, specs, brand and variants', async () => {
    renderPage(fullProduct, [reviewsMock]);
    expect(await screen.findByText('Yoga Mat')).toBeInTheDocument();
    // Selected (first) variant price 1499 formatted as rupees
    expect(screen.getByText('₹1,499')).toBeInTheDocument();
    // Variant chips
    expect(screen.getByText('Blue / M')).toBeInTheDocument();
    expect(screen.getByText('Red / L')).toBeInTheDocument();
    // Brand chip
    expect(screen.getByText('by FitCo')).toBeInTheDocument();
    // Description
    expect(screen.getByText('A premium non-slip yoga mat.')).toBeInTheDocument();
    // Spec rows
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Dimensions')).toBeInTheDocument();
    expect(screen.getByText('180 × 60 × 2 cm')).toBeInTheDocument();
    // Browse-only notice
    expect(screen.getByText(/purchased from a pod's shop/i)).toBeInTheDocument();
  });

  it('swaps price when another variant chip is clicked', async () => {
    renderPage(fullProduct, [reviewsMock]);
    await screen.findByText('Yoga Mat');
    fireEvent.click(screen.getByText('Red / L'));
    expect(await screen.findByText('₹1,999')).toBeInTheDocument();
  });

  it('opens the image lightbox when a product image is clicked', async () => {
    renderPage(fullProduct, [reviewsMock]);
    await screen.findByText('Yoga Mat');
    const imgs = screen.getAllByRole('img', { name: 'Yoga Mat' });
    fireEvent.click(imgs[0]);
    expect(await screen.findByLabelText('Moment preview')).toBeInTheDocument();
  });

  it('opens the brand dialog when the brand chip is clicked', async () => {
    renderPage(fullProduct, [reviewsMock, brandMock]);
    await screen.findByText('Yoga Mat');
    fireEvent.click(screen.getByText('by FitCo'));
    expect(await screen.findByText('Sports gear brand')).toBeInTheDocument();
  });

  it('navigates back when the back button is clicked', async () => {
    renderPage(fullProduct, [reviewsMock]);
    await screen.findByText('Yoga Mat');
    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('falls back to base images, product unit_cost and placeholder text when there are no variants', async () => {
    const noVariant = {
      ...fullProduct,
      variants: [],
      description: '',
      short_description: '',
      brand_id: null,
    };
    renderPage(noVariant, [reviewsMock]);
    await screen.findByText('Yoga Mat');
    // no variants => base product unit_cost 1499
    expect(screen.getByText('₹1,499')).toBeInTheDocument();
    // empty description falls back to placeholder
    expect(screen.getByText(/no description provided/i)).toBeInTheDocument();
    // base images (2) are rendered rather than a variant image
    expect(screen.getAllByRole('img', { name: 'Yoga Mat' })).toHaveLength(2);
    // brand chip present but non-clickable (brand_id null) => clicking opens no dialog
    fireEvent.click(screen.getByText('by FitCo'));
    await waitFor(() => expect(screen.queryByText('Sports gear brand')).not.toBeInTheDocument());
  });

  it('uses short_description when description is empty', async () => {
    const shortOnly = {
      ...fullProduct,
      variants: [],
      description: '',
      short_description: 'Just a short one',
    };
    renderPage(shortOnly, [reviewsMock]);
    await screen.findByText('Yoga Mat');
    expect(screen.getByText('Just a short one')).toBeInTheDocument();
  });

  it('adds the product to the cart via the cheapest stocking pod', async () => {
    renderPage(
      { ...fullProduct, variants: [] },
      [reviewsMock],
      [
        {
          pod_id: 'podA',
          pod_title: 'A',
          club_slug: 'ca',
          product_name: 'Yoga Mat',
          unit_cost: 1600,
          available_count: 5,
          free_delivery_above: null,
          image_url: 'https://img/a.jpg',
        },
        {
          pod_id: 'podB',
          pod_title: 'B',
          club_slug: 'cb',
          product_name: 'Yoga Mat',
          unit_cost: 1499,
          available_count: 8,
          free_delivery_above: 2000,
          image_url: 'https://img/b.jpg',
        },
      ],
    );
    await screen.findByText('Yoga Mat');
    fireEvent.click(await screen.findByRole('button', { name: /add to selection/i }));

    // Persists to the cart via the cheapest pod (podB, ₹1499).
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('mweb_cart_lines') ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        pod_id: 'podB',
        product_id: PRODUCT_ID,
        unit_cost: 1499,
        quantity: 1,
      });
    });
    // The stepper replaces the add button once the product is in the cart.
    expect(await screen.findByLabelText('Increase quantity')).toBeInTheDocument();
  });
});
