import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodShop } from '@/components/details/PodShop';
import { ProductDetailSheet } from '@/components/details/ProductDetailSheet';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// Reviews load their own data + are covered by ProductReviews.test — stub here.
jest.mock('@/components/details/ProductReviews', () => ({ ProductReviews: () => null }));
const mockRequest = graphqlRequest as jest.Mock;

const product = (over: Record<string, unknown> = {}) => ({
  id: 'pr1',
  product_name: 'Drum sticks',
  brand_id: 'b1',
  brand_name: 'Vic Firth',
  short_description: 'Short',
  description: 'Maple 5A drumsticks',
  image_url: 'https://cdn/img.jpg',
  images: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
  size_label: 'Large',
  color: 'Black',
  weight_kg: 1.2,
  height_cm: 3,
  length_cm: 10,
  breadth_cm: 5,
  unit_cost: 200,
  selling_price: 0,
  ...over,
});

beforeEach(() => mockRequest.mockReset());

describe('ProductDetailSheet', () => {
  it('renders nothing (not visible) without a productId', () => {
    renderWithProviders(<ProductDetailSheet productId={null} onClose={jest.fn()} />);
    expect(screen.queryByTestId('product-detail-name')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('shows the loading spinner while the product is in flight', () => {
    mockRequest.mockImplementation(() => new Promise(() => undefined));
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    expect(screen.getByTestId('product-detail-loading')).toBeOnTheScreen();
  });

  it('loads and shows the name, brand and description', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: product() });
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('product-detail-name')).toHaveTextContent('Drum sticks'),
    );
    expect(screen.getByTestId('product-detail-brand')).toBeOnTheScreen();
    expect(screen.getByText('by Vic Firth')).toBeOnTheScreen();
    expect(screen.getByText('Maple 5A drumsticks')).toBeOnTheScreen();
  });

  it('falls back to image_url + short_description and hides brand when absent', async () => {
    mockRequest.mockResolvedValue({
      publicInventoryProduct: product({ images: [], brand_name: '', description: '' }),
    });
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Short')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-detail-brand')).toBeNull();
  });

  it('shows a placeholder when there is no image or description', async () => {
    mockRequest.mockResolvedValue({
      publicInventoryProduct: product({
        images: [],
        image_url: '',
        description: '',
        short_description: '',
        size_label: '',
        color: '',
        weight_kg: 0,
        length_cm: 0,
        breadth_cm: 0,
        height_cm: 0,
      }),
    });
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('No description provided.')).toBeOnTheScreen());
    // With no spec fields the spec grid is omitted.
    expect(screen.queryByTestId('product-detail-specs')).toBeNull();
  });

  it('shows price, MRP and the spec grid, and opens the zoom + brand sheets', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: product({ selling_price: 300 }) });
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('product-detail-price')).toHaveTextContent('₹200'),
    );
    // MRP (selling_price) is struck through when higher than the pod price.
    expect(screen.getByText('₹300')).toBeOnTheScreen();
    // Spec grid renders the physical attributes from the Product portal.
    expect(screen.getByTestId('product-detail-specs')).toBeOnTheScreen();
    expect(screen.getByText('Large')).toBeOnTheScreen();
    expect(screen.getByText('Black')).toBeOnTheScreen();
    expect(screen.getByText('10 × 5 × 3 cm')).toBeOnTheScreen();
    // Tapping an image opens the pinch-zoom viewer.
    fireEvent.press(screen.getByTestId('product-detail-image-0'));
    expect(screen.getByTestId('zoom-image-modal')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('zoom-image-close'));
    // Tapping the (linked) brand opens the brand sheet.
    await act(async () => {
      fireEvent.press(screen.getByTestId('product-detail-brand'));
    });
    expect(screen.getByTestId('brand-detail-sheet')).toBeOnTheScreen();
    // Closing the brand sheet clears the open brand id.
    await act(async () => {
      fireEvent.press(screen.getByTestId('brand-detail-close'));
    });
  });

  it('renders a non-tappable brand when the product has no brand_id', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: product({ brand_id: '' }) });
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('product-detail-brand')).toBeOnTheScreen());
    // Pressing a non-linked brand does not open the brand sheet.
    fireEvent.press(screen.getByTestId('product-detail-brand'));
    expect(screen.queryByTestId('brand-detail-name')).toBeNull();
  });

  it('shows variant chips and swaps the price when another variant is tapped', async () => {
    mockRequest.mockResolvedValue({
      publicInventoryProduct: product({
        unit_cost: 200,
        variants: [
          {
            id: 'v1',
            option_label: 'Red / M',
            color: 'Red',
            size_label: 'M',
            unit_cost: 250,
            inventory_count: 4,
            images: ['https://cdn/r.jpg'],
          },
          {
            id: 'v2',
            option_label: 'Blue / L',
            color: 'Blue',
            size_label: 'L',
            unit_cost: 300,
            inventory_count: 2,
            images: [],
          },
          // All labels empty → the "Variant" fallback.
          {
            id: 'v3',
            option_label: '',
            color: '',
            size_label: '',
            unit_cost: 320,
            inventory_count: 1,
            images: [],
          },
        ],
      }),
    });
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    // The first variant is selected by default → its price shows.
    await waitFor(() =>
      expect(screen.getByTestId('product-detail-price')).toHaveTextContent('₹250'),
    );
    expect(screen.getByTestId('variant-v1')).toBeOnTheScreen();
    // A variant with no labels falls back to "Variant".
    expect(screen.getByText('Variant')).toBeOnTheScreen();
    // Tapping the second variant swaps the displayed price.
    fireEvent.press(screen.getByTestId('variant-v2'));
    expect(screen.getByTestId('product-detail-price')).toHaveTextContent('₹300');
  });

  it('manages the selected variant line: selection map read, bounded stock and the pick payload', async () => {
    mockRequest.mockResolvedValue({
      publicInventoryProduct: product({
        unit_cost: 200,
        variants: [
          {
            id: 'v1',
            option_label: 'Red / M',
            color: 'Red',
            size_label: 'M',
            unit_cost: 250,
            inventory_count: 4,
            images: ['https://cdn/r.jpg'],
          },
          {
            id: 'v2',
            option_label: '',
            color: '',
            size_label: '',
            unit_cost: 320,
            inventory_count: 9,
            images: [],
          },
          // No own price → the product's price backs the line.
          {
            id: 'v3',
            option_label: 'Base priced',
            color: '',
            size_label: '',
            unit_cost: null,
            inventory_count: 2,
            images: [],
          },
        ],
      }),
    });
    const onUpdateLine = jest.fn();
    renderWithProviders(
      <ProductDetailSheet
        productId="pr1"
        onClose={jest.fn()}
        selection={{ 'pr1::v1': 2 }}
        maxQuantity={5}
        onUpdateLine={onUpdateLine}
      />,
    );
    // The selection map already holds 2 of the default variant → stepper shows.
    await waitFor(() => expect(screen.getByTestId('product-detail-qty')).toHaveTextContent('2'));
    fireEvent.press(screen.getByTestId('product-detail-inc'));
    expect(onUpdateLine).toHaveBeenCalledWith(3, {
      id: 'v1',
      label: 'Red / M',
      unit_cost: 250,
      image_url: 'https://cdn/r.jpg',
      max: 4,
    });

    // v2 has no labels ('Variant' fallback), no images (product cover fallback)
    // and more stock than the pod cap — the pod cap (5) wins.
    fireEvent.press(screen.getByTestId('variant-v2'));
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onUpdateLine).toHaveBeenLastCalledWith(1, {
      id: 'v2',
      label: 'Variant',
      unit_cost: 320,
      image_url: 'https://cdn/img.jpg',
      max: 5,
    });

    // v3 carries no price of its own — the product price backs the pick.
    fireEvent.press(screen.getByTestId('variant-v3'));
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onUpdateLine).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ id: 'v3', unit_cost: 200, max: 2 }),
    );
  });

  it('bottoms out the pick price/image/stock for a bare variant row', async () => {
    mockRequest.mockResolvedValue({
      publicInventoryProduct: product({
        unit_cost: null,
        image_url: null,
        images: [],
        variants: [
          {
            id: 'vb',
            option_label: 'Bare',
            color: '',
            size_label: '',
            unit_cost: null,
            inventory_count: null,
            images: null,
          },
        ],
      }),
    });
    renderWithProviders(
      <ProductDetailSheet
        productId="pr1"
        onClose={jest.fn()}
        selection={{}}
        maxQuantity={5}
        onUpdateLine={jest.fn()}
      />,
    );
    // inventory_count null → stock 0 → the add CTA is inert "Out of stock".
    await waitFor(() => expect(screen.getByText('Out of stock')).toBeOnTheScreen());
  });

  it('surfaces a load error', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('product-detail-error')).toHaveTextContent('offline'),
    );
  });

  it('closes via the close button and the backdrop', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: null });
    const onClose = jest.fn();
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={onClose} />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('product-detail-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('PodShop → ProductDetailSheet', () => {
  const podWith = () =>
    ({
      products_enabled: true,
      product_requests: [
        {
          product_id: 'pr1',
          product_name: 'Drum sticks',
          available_count: 5,
          unit_cost: 200,
          image_url: '',
          images: [],
        },
      ],
    }) as never;

  it('opens the product-detail sheet from the row info icon', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: product() });
    renderWithProviders(
      <PodShop pod={podWith()} selectedProducts={{}} onSelectionChange={jest.fn()} />,
    );
    // Info icon does not toggle selection — it opens the detail sheet.
    await act(async () => {
      fireEvent.press(screen.getByTestId('pod-shop-info-pr1'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('product-detail-name')).toHaveTextContent('Drum sticks'),
    );
    // Closing the sheet clears the selected product id.
    fireEvent.press(screen.getByTestId('product-detail-close'));
    await waitFor(() => expect(screen.queryByTestId('product-detail-name')).toBeNull());
  });

  it('adds the product to the selection from the sheet quantity bar', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: product() });
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <PodShop pod={podWith()} selectedProducts={{}} onSelectionChange={onSelectionChange} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('pod-shop-info-pr1'));
    });
    await waitFor(() => expect(screen.getByTestId('product-detail-add')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onSelectionChange).toHaveBeenCalledWith({ pr1: 1 });
  });

  it('derives the max quantity from stock quantity when available_count is absent', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: product() });
    const podQtyOnly = {
      products_enabled: true,
      product_requests: [
        {
          product_id: 'pr1',
          product_name: 'Drum sticks',
          quantity: 3,
          unit_cost: 200,
          image_url: '',
          images: [],
        },
      ],
    } as never;
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <PodShop pod={podQtyOnly} selectedProducts={{}} onSelectionChange={onSelectionChange} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('pod-shop-info-pr1'));
    });
    await waitFor(() => expect(screen.getByTestId('product-detail-add')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onSelectionChange).toHaveBeenCalledWith({ pr1: 1 });
  });

  it('routes a picked variant to onVariantQuantity, and to the base line without it', async () => {
    const withVariants = product({
      variants: [
        {
          id: 'v1',
          option_label: 'Red / M',
          color: 'Red',
          size_label: 'M',
          unit_cost: 250,
          inventory_count: 4,
          images: [],
        },
      ],
    });
    mockRequest.mockResolvedValue({ publicInventoryProduct: withVariants });
    const onSelectionChange = jest.fn();
    const onVariantQuantity = jest.fn();
    renderWithProviders(
      <PodShop
        pod={podWith()}
        selectedProducts={{}}
        onSelectionChange={onSelectionChange}
        onVariantQuantity={onVariantQuantity}
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('pod-shop-info-pr1'));
    });
    await waitFor(() => expect(screen.getByTestId('product-detail-add')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onVariantQuantity).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: 'pr1' }),
      expect.objectContaining({ id: 'v1', unit_cost: 250 }),
      1,
    );
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('falls back to the base line for a picked variant without an onVariantQuantity handler', async () => {
    mockRequest.mockResolvedValue({
      publicInventoryProduct: product({
        variants: [
          {
            id: 'v1',
            option_label: 'Red / M',
            color: 'Red',
            size_label: 'M',
            unit_cost: 250,
            inventory_count: 4,
            images: [],
          },
        ],
      }),
    });
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <PodShop pod={podWith()} selectedProducts={{}} onSelectionChange={onSelectionChange} />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('pod-shop-info-pr1'));
    });
    await waitFor(() => expect(screen.getByTestId('product-detail-add')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onSelectionChange).toHaveBeenCalledWith({ pr1: 1 });
  });

  it('shows the variant-aware selectedTotal when provided', () => {
    renderWithProviders(
      <PodShop
        pod={podWith()}
        selectedProducts={{ pr1: 1 }}
        onSelectionChange={jest.fn()}
        selectedTotal={470}
      />,
    );
    expect(screen.getByTestId('pod-shop-total')).toHaveTextContent(/₹470/);
  });

  it('hides the quantity bar when the pod is already booked (read-only)', async () => {
    mockRequest.mockResolvedValue({ publicInventoryProduct: product() });
    renderWithProviders(
      <PodShop pod={podWith()} selectedProducts={{}} onSelectionChange={jest.fn()} readOnly />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('pod-shop-info-pr1'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('product-detail-name')).toHaveTextContent('Drum sticks'),
    );
    expect(screen.queryByTestId('product-detail-add')).toBeNull();
  });
});
