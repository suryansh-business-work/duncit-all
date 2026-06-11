import { fireEvent, screen } from '@testing-library/react-native';

import { CountryStateChips } from '@/components/LocationDialog/CountryStateChips';
import { buildLocationTree } from '@/utils/location-tree';
import { renderWithProviders } from '@/utils/test-utils';
import type { LocationItem } from '@/stores/location.store';

const city = (state: string, code: string): LocationItem =>
  ({
    id: `c-${code}`,
    location_name: `City ${code}`,
    city: `City ${code}`,
    state,
    state_code: code,
    country: 'India',
    country_code: 'IN',
    location_image: '',
    location_pincode: '',
    location_zones: [],
  }) as LocationItem;

// 7 states → the state search box is shown (threshold > 6).
const tree = buildLocationTree([
  city('Assam', 'AS'),
  city('Bihar', 'BR'),
  city('Delhi', 'DL'),
  city('Goa', 'GA'),
  city('Kerala', 'KL'),
  city('Maharashtra', 'MH'),
  city('Punjab', 'PB'),
]);

describe('CountryStateChips', () => {
  it('renders nothing for an empty tree', () => {
    renderWithProviders(
      <CountryStateChips tree={[]} country="" state="" onCountry={jest.fn()} onState={jest.fn()} />,
    );
    expect(screen.queryByTestId('country-IN')).toBeNull();
  });

  it('filters states via the search box and selects one', () => {
    const onState = jest.fn();
    renderWithProviders(
      <CountryStateChips
        tree={tree}
        country="India"
        state="Delhi"
        onCountry={jest.fn()}
        onState={onState}
      />,
    );
    expect(screen.getByTestId('state-MH')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('state-search'), 'goa');
    expect(screen.queryByTestId('state-MH')).toBeNull();
    fireEvent.press(screen.getByTestId('state-GA'));
    expect(onState).toHaveBeenCalledWith('Goa');
  });

  it('shows an empty message when no state matches', () => {
    renderWithProviders(
      <CountryStateChips
        tree={tree}
        country="India"
        state="Delhi"
        onCountry={jest.fn()}
        onState={jest.fn()}
      />,
    );
    fireEvent.changeText(screen.getByTestId('state-search'), 'zzz');
    expect(screen.getByText('No matching states.')).toBeOnTheScreen();
  });
});
