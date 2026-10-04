import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VenuesScreen } from '@/screens/VenuesScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocationStore } from '@/stores/location.store';
import { useSuperCategoryStore } from '@/stores/super-category.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  // Venues is a bottom tab now, so the tab scaffold reads the active route.
  useRoute: () => ({ name: 'Venues' }),
}));
// The tab scaffold's app header and super-category switch are unit-tested on
// their own (and fetch their own data); stub them so only this screen's
// requests reach the mocked client.
jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@/components/SuperCategoryTabs', () => ({ SuperCategoryTabs: () => null }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
let mockAds: unknown[] = [];
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: mockAds, loading: false }),
}));

const opName = (doc: { definitions?: { name?: { value?: string } }[] }) =>
  doc?.definitions?.[0]?.name?.value;

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

const route = (venues = [venue('v1', 'Turf One')]) => {
  mockRequest.mockImplementation(() => Promise.resolve({ publicVenues: venues }));
};

// The header's Super-category tiles (an app-wide store) are the list's filter.
// Seeded so the store never fetches; with nothing picked, the first tile is.
const superCat = (id: string, slug: string) => ({
  id,
  name: slug,
  slug,
  icon: null,
  description: null,
});
const seedSuperCategories = (categories: ReturnType<typeof superCat>[] | null) =>
  useSuperCategoryStore.setState({
    data: { categories } as never,
    isLoading: false,
    selectedSlug: '',
  });

const venuesCalls = () => mockRequest.mock.calls.filter((c) => opName(c[0]) === 'MobileVenues');

beforeEach(() => {
  mockRequest.mockReset();
  mockNavigate.mockReset();
  mockAds = [];
  seedSuperCategories([superCat('sup1', 'sports'), superCat('sup2', 'food')]);
  useLocationStore.setState({ selectedId: 'loc1', cityLabel: 'Pune' });
});

afterEach(() => {
  useLocationStore.setState({ selectedId: '', cityLabel: '' });
});

describe('VenuesScreen', () => {
  it('lists venues scoped to the selected location and opens a venue', async () => {
    route();
    renderWithProviders(<VenuesScreen />);
    expect(await screen.findByTestId('venue-card-v1')).toBeOnTheScreen();
    // Scoped to the header's city and its first (auto-picked) Super-category tile.
    expect(venuesCalls().at(-1)?.[1]).toMatchObject({
      location_id: 'loc1',
      search: null,
      super_category_id: 'sup1',
    });
    // The card itself is not pressable (its photo slider owns its taps); the
    // name block opens the venue.
    fireEvent.press(screen.getByRole('button', { name: 'Turf One' }));
    expect(mockNavigate).toHaveBeenCalledWith('VenueDetails', { venueId: 'v1' });
  });

  it('interleaves a sponsored banner after every 4 venues', async () => {
    mockAds = [
      {
        id: 'ad1',
        ad_type: 'IMAGE',
        media_url: 'https://cdn/ad.jpg',
        redirect_url: null,
        ad_title: 'Sponsored Turf',
        position: 'VENUE_LIST',
      },
    ];
    route([
      venue('v1', 'Turf One'),
      venue('v2', 'Turf Two'),
      venue('v3', 'Turf Three'),
      venue('v4', 'Turf Four'),
      venue('v5', 'Turf Five'),
    ]);
    renderWithProviders(<VenuesScreen />);
    expect(await screen.findByTestId('ad-card-ad1')).toBeOnTheScreen();
    expect(screen.getByText('Sponsored Turf')).toBeOnTheScreen();
    // Venues still render around the woven banner.
    expect(screen.getByTestId('venue-card-v4')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-card-v5')).toBeOnTheScreen();
  });

  it('debounces typing into one server-side search', async () => {
    jest.useFakeTimers();
    try {
      route();
      renderWithProviders(<VenuesScreen />);
      fireEvent.changeText(screen.getByTestId('venues-search'), 'tur');
      fireEvent.changeText(screen.getByTestId('venues-search'), 'turf');
      // Before the 400ms window closes, no search request was sent.
      expect(venuesCalls().some((c) => c[1].search === 'turf')).toBe(false);
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(venuesCalls().some((c) => c[1].search === 'turf')).toBe(true);
      expect(venuesCalls().some((c) => c[1].search === 'tur')).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('refetches when the header Super-category tile changes', async () => {
    route();
    renderWithProviders(<VenuesScreen />);
    await waitFor(() =>
      expect(venuesCalls().some((c) => c[1].super_category_id === 'sup1')).toBe(true),
    );
    expect(venuesCalls().some((c) => c[1].super_category_id === 'sup2')).toBe(false);
    act(() => {
      useSuperCategoryStore.getState().select('food');
    });
    await waitFor(() => expect(venuesCalls().at(-1)?.[1].super_category_id).toBe('sup2'));
    expect(await screen.findByTestId('venue-card-v1')).toBeOnTheScreen();
  });

  it('shows the empty state (tolerating a null categories payload), and the error state', async () => {
    seedSuperCategories(null);
    mockRequest.mockImplementation(() => Promise.resolve({ publicVenues: [] }));
    const { unmount } = renderWithProviders(<VenuesScreen />);
    expect(await screen.findByTestId('venues-empty')).toBeOnTheScreen();
    // No tiles to pick from, so the list is not narrowed by one.
    expect(venuesCalls().at(-1)?.[1]).toMatchObject({ super_category_id: null });
    unmount();

    mockRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(<VenuesScreen />);
    expect(await screen.findByTestId('venues-error')).toBeOnTheScreen();
  });

  it('ignores late responses after unmount and hides the header without a city', async () => {
    useLocationStore.setState({ selectedId: '', cityLabel: '' });
    const resolvers: ((v: unknown) => void)[] = [];
    mockRequest.mockImplementation(
      () =>
        new Promise((r) => {
          resolvers.push(r);
        }),
    );
    const { unmount } = renderWithProviders(<VenuesScreen />);
    // No selected city → no location arg sent.
    expect(venuesCalls()[0][1]).toMatchObject({ location_id: null });
    unmount();
    // Responses landing after unmount must not update state (no act warnings).
    await act(async () => {
      resolvers.forEach((resolve) => resolve({ publicVenues: [] }));
    });
  });
});
