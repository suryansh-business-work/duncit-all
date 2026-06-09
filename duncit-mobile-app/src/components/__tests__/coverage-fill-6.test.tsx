import { fireEvent, screen } from '@testing-library/react-native';

import { AreaList } from '@/components/LocationDialog/AreaList';
import { CityList } from '@/components/LocationDialog/CityList';
import { CountryStateChips } from '@/components/LocationDialog/CountryStateChips';
import { SidebarPolicies } from '@/components/Sidebar/SidebarPolicies';
import { renderWithProviders } from '@/utils/test-utils';

describe('CityList empty', () => {
  it('shows the empty hint when there are no cities', () => {
    renderWithProviders(<CityList cities={[]} draftId="" onPick={jest.fn()} />);
    expect(screen.getByText('No cities here yet.')).toBeOnTheScreen();
  });
});

describe('CountryStateChips', () => {
  it('renders a state search for >6 states and falls back to names for empty codes', () => {
    const states = Array.from({ length: 7 }, (_, i) => ({
      state: `State ${i}`,
      state_code: '',
      cities: [],
    }));
    const tree = [{ country: 'India', country_code: '', states }] as never;
    renderWithProviders(
      <CountryStateChips
        tree={tree}
        country="India"
        state="State 0"
        onCountry={jest.fn()}
        onState={jest.fn()}
      />,
    );
    expect(screen.getByTestId('country-India')).toBeOnTheScreen();
    expect(screen.getByTestId('state-State 0')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('state-search'), 'state 3');
    expect(screen.getByTestId('state-State 3')).toBeOnTheScreen();
  });

  it('returns null for an empty tree', () => {
    renderWithProviders(
      <CountryStateChips tree={[]} country="" state="" onCountry={jest.fn()} onState={jest.fn()} />,
    );
    expect(screen.queryByTestId('state-search')).toBeNull();
  });
});

describe('AreaList', () => {
  it('picks all areas, filters with a null pincode and labels a localityless zone', () => {
    const onZone = jest.fn();
    renderWithProviders(
      <AreaList
        locationName="Mumbai"
        zones={[{ zone_name: 'Andheri', pincode: null }]}
        draftZone=""
        onZone={onZone}
      />,
    );
    fireEvent.press(screen.getByTestId('area-all'));
    expect(onZone).toHaveBeenCalledWith('');
    expect(screen.getByTestId('area-Andheri')).toBeOnTheScreen();
    // A non-matching term forces the pincode (null) side of the filter.
    fireEvent.changeText(screen.getByTestId('area-search'), 'zzz');
    expect(screen.getByText('No matching areas.')).toBeOnTheScreen();
  });

  it('shows the empty hint when a city has no areas', () => {
    renderWithProviders(
      <AreaList locationName="Pune" zones={[]} draftZone="" onZone={jest.fn()} />,
    );
    expect(screen.getByText('This city has no areas configured.')).toBeOnTheScreen();
  });
});

describe('SidebarPolicies empty', () => {
  it('renders nothing without policies', () => {
    renderWithProviders(<SidebarPolicies policies={[]} onSelect={jest.fn()} />);
    expect(screen.queryByTestId('sidebar-policies')).toBeNull();
  });
});
