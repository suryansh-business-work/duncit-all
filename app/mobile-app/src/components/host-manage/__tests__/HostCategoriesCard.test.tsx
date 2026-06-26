import { screen, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { HostCategoriesCard } from '@/components/host-manage/HostCategoriesCard';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const cat = (over: Record<string, string> = {}) => ({
  super_category_name: 'Sports',
  category_name: 'Cricket',
  sub_category_name: 'Box',
  ...over,
});

beforeEach(() => mockRequest.mockReset());

describe('HostCategoriesCard', () => {
  it('lists the host categories as "Super › Category › Sub", dropping empty parts', async () => {
    mockRequest.mockResolvedValue({
      myHost: {
        host_categories: [cat(), cat({ super_category_name: 'Music', sub_category_name: '' })],
      },
    });
    renderWithProviders(<HostCategoriesCard />);
    expect(await screen.findByText('Your hosting categories')).toBeOnTheScreen();
    expect(screen.getByText('Sports › Cricket › Box')).toBeOnTheScreen();
    // Empty sub is dropped, separator stays " › ".
    expect(screen.getByText('Music › Cricket')).toBeOnTheScreen();
  });

  it('renders nothing when the host holds no categories', async () => {
    mockRequest.mockResolvedValue({ myHost: { host_categories: [] } });
    renderWithProviders(<HostCategoriesCard />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('host-categories-card')).toBeNull();
  });

  it('renders nothing when there is no host doc', async () => {
    mockRequest.mockResolvedValue({ myHost: null });
    renderWithProviders(<HostCategoriesCard />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('host-categories-card')).toBeNull();
  });

  it('tolerates a load failure', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(<HostCategoriesCard />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('host-categories-card')).toBeNull();
  });
});
