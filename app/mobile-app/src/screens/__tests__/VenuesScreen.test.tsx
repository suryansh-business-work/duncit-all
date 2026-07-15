import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VenuesScreen } from '@/screens/VenuesScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { useLocationStore } from '@/stores/location.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

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
  mockRequest.mockImplementation((doc: never) => {
    if (opName(doc) === 'SurveyOnboardingCategories') {
      return Promise.resolve({
        categories: [
          {
            id: 'sup1',
            name: 'Sports',
            level: 'SUPER',
            parent_id: null,
            is_active: true,
            sort_order: 0,
          },
          {
            id: 'sup0',
            name: 'Hidden',
            level: 'SUPER',
            parent_id: null,
            is_active: false,
            sort_order: 0,
          },
        ],
      });
    }
    return Promise.resolve({ publicVenues: venues });
  });
};

const venuesCalls = () => mockRequest.mock.calls.filter((c) => opName(c[0]) === 'MobileVenues');

beforeEach(() => {
  mockRequest.mockReset();
  mockNavigate.mockReset();
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
    expect(screen.getByText('Venues in Pune')).toBeOnTheScreen();
    // Inactive categories are filtered from the chip rail.
    expect(screen.getByTestId('venues-cat-sup1')).toBeOnTheScreen();
    expect(screen.queryByTestId('venues-cat-sup0')).toBeNull();
    expect(venuesCalls()[0][1]).toMatchObject({ location_id: 'loc1', search: null });
    fireEvent.press(screen.getByTestId('venue-card-v1'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueDetails', { venueId: 'v1' });
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

  it('filters by a Super-category chip and clears via All', async () => {
    route();
    renderWithProviders(<VenuesScreen />);
    fireEvent.press(await screen.findByTestId('venues-cat-sup1'));
    await waitFor(() =>
      expect(venuesCalls().some((c) => c[1].super_category_id === 'sup1')).toBe(true),
    );
    fireEvent.press(screen.getByTestId('venues-cat-all'));
    await waitFor(() => {
      const last = venuesCalls().at(-1);
      expect(last?.[1].super_category_id).toBeNull();
    });
  });

  it('shows the empty state (tolerating a null categories payload), and the error state', async () => {
    mockRequest.mockImplementation((doc: never) => {
      if (opName(doc) === 'SurveyOnboardingCategories') {
        return Promise.resolve({ categories: null });
      }
      return Promise.resolve({ publicVenues: [] });
    });
    const { unmount } = renderWithProviders(<VenuesScreen />);
    expect(await screen.findByTestId('venues-empty')).toBeOnTheScreen();
    unmount();

    mockRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(<VenuesScreen />);
    expect(await screen.findByTestId('venues-error')).toBeOnTheScreen();
  });

  it('ignores late responses after unmount and hides the header without a city', async () => {
    useLocationStore.setState({ selectedId: '', cityLabel: '' });
    let resolveCats: (v: unknown) => void = () => undefined;
    let resolveVenues: (v: unknown) => void = () => undefined;
    mockRequest.mockImplementation((doc: never) => {
      if (opName(doc) === 'SurveyOnboardingCategories') {
        return new Promise((r) => {
          resolveCats = r;
        });
      }
      return new Promise((r) => {
        resolveVenues = r;
      });
    });
    const { unmount } = renderWithProviders(<VenuesScreen />);
    // No selected city → no "Venues in …" header, and no location arg sent.
    expect(screen.queryByText(/Venues in/)).toBeNull();
    expect(venuesCalls()[0][1]).toMatchObject({ location_id: null });
    unmount();
    // Responses landing after unmount must not update state (no act warnings).
    await act(async () => {
      resolveCats({ categories: [] });
      resolveVenues({ publicVenues: [] });
    });
  });
});
