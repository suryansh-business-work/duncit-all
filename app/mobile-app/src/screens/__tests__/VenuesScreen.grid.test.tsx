import { screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { VenuesScreen } from '@/screens/VenuesScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocationStore } from '@/stores/location.store';
import { useSuperCategoryStore } from '@/stores/super-category.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ name: 'Venues' }),
}));
// The header and the super-category switch fetch their own data and are
// unit-tested on their own; only this screen's grid is under test here.
jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@/components/SuperCategoryTabs', () => ({ SuperCategoryTabs: () => null }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
let mockAds: unknown[] = [];
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: mockAds, loading: false }),
}));

const mockRequest = graphqlRequest as jest.Mock;

const venue = (id: string, name: string) => ({
  id,
  owner_user_id: 'o1',
  venue_name: name,
  venue_type: 'Turf',
  capacity: 20,
  description: '',
  cover_image_url: '',
  gallery: [],
  address_line1: '',
  address_line2: '',
  country: 'India',
  city: 'Pune',
  state: 'MH',
  locality: 'Kothrud',
  postal_code: '',
  lat: null,
  lng: null,
  amenities: [],
  facilities: [],
  security: [],
  tags: [],
  pod_count: 2,
  venue_category: null,
});

const FIVE_VENUES = ['v1', 'v2', 'v3', 'v4', 'v5'].map((id) => venue(id, `Turf ${id}`));

const AD = {
  id: 'ad1',
  ad_type: 'IMAGE',
  media_url: 'https://cdn/ad.jpg',
  redirect_url: null,
  ad_title: 'Sponsored Turf',
  position: 'VENUE_LIST',
};

/** Pin the window to a phone or a tablet; useWindowDimensions reads it. */
const setWindowWidth = (width: number) =>
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height: 1024, scale: 2, fontScale: 1 });

/** The grid cell a card sits in — its nearest rendered (host) ancestor. */
const cellOf = (element: ReactTestInstance) => {
  let node = element.parent;
  while (node && typeof node.type !== 'string') node = node.parent;
  if (!node) throw new Error('no grid cell around the element');
  return node;
};

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockImplementation(() => Promise.resolve({ publicVenues: FIVE_VENUES }));
  mockAds = [AD];
  useSuperCategoryStore.setState({
    data: { categories: [{ id: 'sup1', name: 'sports', slug: 'sports' }] } as never,
    isLoading: false,
    selectedSlug: '',
  });
  useLocationStore.setState({ selectedId: 'loc1', cityLabel: 'Pune' });
});

afterEach(() => {
  jest.restoreAllMocks();
  useLocationStore.setState({ selectedId: '', cityLabel: '' });
});

describe('VenuesScreen grid', () => {
  it('stacks one full-width card per row on a phone', async () => {
    setWindowWidth(390);
    renderWithProviders(<VenuesScreen />);
    const first = await screen.findByTestId('venue-card-v1');
    expect(screen.getByTestId('venues-grid')).toBeOnTheScreen();
    expect(cellOf(first)).toHaveStyle({ width: '100%' });
    expect(cellOf(screen.getByTestId('venue-card-v5'))).toHaveStyle({ width: '100%' });
  });

  it('sits two cards to a row from the 600px breakpoint up, the banner spanning the row', async () => {
    // 768 wide: (768 − 2 × 16 padding − 12 gap) / 2 = 362 per card.
    setWindowWidth(768);
    renderWithProviders(<VenuesScreen />);
    const first = await screen.findByTestId('venue-card-v1');
    expect(cellOf(first)).toHaveStyle({ width: 362 });
    expect(cellOf(screen.getByTestId('venue-card-v2'))).toHaveStyle({ width: 362 });
    // The sponsored banner woven in after the fourth venue still takes a full row.
    expect(cellOf(screen.getByTestId('ad-card-ad1'))).toHaveStyle({ width: '100%' });
  });

  it('switches to two columns exactly at 600px', async () => {
    // (600 − 32 − 12) / 2 = 278.
    setWindowWidth(600);
    renderWithProviders(<VenuesScreen />);
    expect(cellOf(await screen.findByTestId('venue-card-v1'))).toHaveStyle({ width: 278 });
  });

  it('floors an odd half so two cards never overflow the row', async () => {
    // (601 − 32 − 12) / 2 = 278.5 → 278.
    setWindowWidth(601);
    renderWithProviders(<VenuesScreen />);
    expect(cellOf(await screen.findByTestId('venue-card-v1'))).toHaveStyle({ width: 278 });
  });

  it('keeps one column just under the breakpoint', async () => {
    setWindowWidth(599);
    renderWithProviders(<VenuesScreen />);
    expect(cellOf(await screen.findByTestId('venue-card-v1'))).toHaveStyle({ width: '100%' });
  });
});
