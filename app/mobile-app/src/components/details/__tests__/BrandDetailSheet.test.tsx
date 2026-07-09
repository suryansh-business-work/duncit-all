import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BrandDetailSheet } from '@/components/details/BrandDetailSheet';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const brand = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  brand_name: 'Vic Firth',
  logo_url: 'https://cdn/logo.jpg',
  cover_image_url: 'https://cdn/cover.jpg',
  tagline: 'Sticks & mallets',
  description: 'Legendary drumsticks since 1963.',
  website_url: '',
  instagram_url: '',
  product_categories: [],
  established_year: 1963,
  city: 'Boston',
  state: 'MA',
  approved_product_count: 12,
  ...over,
});

beforeEach(() => mockRequest.mockReset());

describe('BrandDetailSheet', () => {
  it('is hidden and does not fetch without a brandId', () => {
    renderWithProviders(<BrandDetailSheet brandId={null} onClose={jest.fn()} />);
    expect(screen.queryByTestId('brand-detail-name')).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('shows a spinner then the full brand card', async () => {
    mockRequest.mockResolvedValue({ publicEcommBrand: brand() });
    renderWithProviders(<BrandDetailSheet brandId="b1" onClose={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('brand-detail-name')).toHaveTextContent('Vic Firth'),
    );
    expect(screen.getByText('Sticks & mallets')).toBeOnTheScreen();
    expect(screen.getByText('Legendary drumsticks since 1963.')).toBeOnTheScreen();
    expect(screen.getByText('Boston, MA')).toBeOnTheScreen();
    expect(screen.getByText('Since 1963')).toBeOnTheScreen();
    expect(screen.getByText('12 products')).toBeOnTheScreen();
  });

  it('renders the fallback icon and skips empty optional fields', async () => {
    mockRequest.mockResolvedValue({
      publicEcommBrand: brand({
        logo_url: '',
        cover_image_url: '',
        tagline: '',
        description: '',
        established_year: null,
        city: '',
        state: '',
        approved_product_count: 0,
      }),
    });
    renderWithProviders(<BrandDetailSheet brandId="b1" onClose={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('brand-detail-name')).toHaveTextContent('Vic Firth'),
    );
    expect(screen.getByText('0 products')).toBeOnTheScreen();
    expect(screen.queryByText('Since 1963')).toBeNull();
  });

  it('shows the empty state on a missing brand or error, and closes', async () => {
    mockRequest.mockResolvedValue({ publicEcommBrand: null });
    const onClose = jest.fn();
    renderWithProviders(<BrandDetailSheet brandId="b1" onClose={onClose} />);
    await waitFor(() => expect(screen.getByTestId('brand-detail-empty')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('brand-detail-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to the empty state when the query rejects', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<BrandDetailSheet brandId="b1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('brand-detail-empty')).toBeOnTheScreen());
  });
});
