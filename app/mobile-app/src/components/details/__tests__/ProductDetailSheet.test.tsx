import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodShop } from '@/components/details/PodShop';
import { ProductDetailSheet } from '@/components/details/ProductDetailSheet';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const product = (over: Record<string, unknown> = {}) => ({
  id: 'pr1',
  product_name: 'Drum sticks',
  brand_name: 'Vic Firth',
  short_description: 'Short',
  description: 'Maple 5A drumsticks',
  image_url: 'https://cdn/img.jpg',
  images: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
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
      }),
    });
    renderWithProviders(<ProductDetailSheet productId="pr1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('No description provided.')).toBeOnTheScreen());
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
});
