import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import type { FoodMenuConfig, FoodMenuVenue } from '@duncit/utils';

import { VenueFoodMenuBody } from '@/components/venue-food-desk/menu/VenueFoodMenuBody';
import { useFoodMenu } from '@/hooks/useFoodMenu';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useFoodMenu', () => ({ useFoodMenu: jest.fn() }));
// The form has its own suite; here it only has to show which venue it was handed.
jest.mock('@/components/venue-food-desk/menu/FoodMenuForm', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    FoodMenuForm: ({ venue, onSaved }: { venue: { id: string }; onSaved: unknown }) => (
      <Text testID="food-menu-form-stub" onPress={() => (onSaved as (v: unknown) => void)(venue)}>
        {venue.id}
      </Text>
    ),
  };
});

const CONFIG: FoodMenuConfig = {
  food_diets: ['VEG'],
  food_spice_levels: ['NONE'],
  food_menu_limit: 10,
  food_image_limit: 4,
  food_price_max: 10000,
  food_discount_max_pct: 30,
  food_video_limit: 2,
  food_table_limit: 20,
};

const venue = (status: string): FoodMenuVenue => ({
  id: 'v1',
  venue_name: 'Sunset Cafe',
  status,
  offers_food: true,
  food_menu: [],
});

const refetch = jest.fn();
const replaceVenue = jest.fn();

type FoodMenuState = ReturnType<typeof useFoodMenu>;

const mockState = (over: Partial<FoodMenuState>) => {
  jest.mocked(useFoodMenu).mockReturnValue({
    venue: null,
    config: null,
    error: null,
    isLoading: false,
    refetch,
    replaceVenue,
    ...over,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  refetch.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('VenueFoodMenuBody', () => {
  it('shows the spinner while the first read is in flight', () => {
    mockState({ isLoading: true });
    renderWithProviders(<VenueFoodMenuBody venueId="v1" />);

    expect(screen.getByLabelText('Loading…')).toBeOnTheScreen();
    expect(screen.queryByTestId('food-menu-form-stub')).toBeNull();
    expect(useFoodMenu).toHaveBeenCalledWith('v1');
  });

  it('keeps the form up while a refetch runs on a venue it already has', () => {
    mockState({ isLoading: true, venue: venue('APPROVED'), config: CONFIG });
    renderWithProviders(<VenueFoodMenuBody venueId="v1" />);

    expect(screen.queryByLabelText('Loading…')).toBeNull();
    expect(screen.getByTestId('food-menu-form-stub')).toHaveTextContent('v1');
  });

  it("shows the read's error and retries it", () => {
    mockState({ error: 'Network request failed' });
    renderWithProviders(<VenueFoodMenuBody venueId="v1" />);

    expect(screen.getByTestId('food-menu-load-error')).toHaveTextContent('Network request failed', {
      exact: false,
    });
    fireEvent.press(screen.getByTestId('food-menu-retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the load-failed copy when the venue or the caps are missing', () => {
    mockState({ venue: venue('APPROVED'), config: null });
    renderWithProviders(<VenueFoodMenuBody venueId="v1" />);

    expect(screen.getByTestId('food-menu-load-error')).toHaveTextContent(
      'Could not load the food menu settings.',
      { exact: false },
    );
    expect(screen.queryByTestId('food-menu-form-stub')).toBeNull();
  });

  it("sends a venue still under review to the venue form's Food tab", () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockState({ venue: venue('PENDING'), config: CONFIG });
    renderWithProviders(<VenueFoodMenuBody venueId="v1" />);

    expect(screen.getByTestId('food-menu-not-approved')).toHaveTextContent(
      'This venue is not approved yet.',
      { exact: false },
    );
    expect(screen.queryByTestId('food-menu-form-stub')).toBeNull();

    fireEvent.press(screen.getByTestId('food-menu-edit-venue'));
    expect(openURL).toHaveBeenCalledWith(
      expect.stringMatching(/\/register-venue\/v1\?selectedtab=food$/),
    );
  });

  it("opens an approved venue's menu form and hands it the save callback", () => {
    mockState({ venue: venue('APPROVED'), config: CONFIG });
    renderWithProviders(<VenueFoodMenuBody venueId="v1" />);

    fireEvent.press(screen.getByTestId('food-menu-form-stub'));
    expect(replaceVenue).toHaveBeenCalledWith(venue('APPROVED'));
  });
});
