import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useLocationDraft } from '@/components/LocationDialog/useLocationDraft';
import { useLocations } from '@/hooks/useLocations';

jest.mock('@/hooks/useLocations');
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 1, longitude: 1 } }),
  reverseGeocodeAsync: jest.fn(),
}));

const mockedLoc = useLocations as jest.Mock;
const reverse = Location.reverseGeocodeAsync as jest.Mock;

const loc = (over: Record<string, unknown>) => ({
  id: 'l1',
  location_name: 'Town',
  city: 'Town',
  state: 'State',
  state_code: 'ST',
  country: 'India',
  country_code: 'IN',
  location_image: '',
  location_pincode: '',
  location_zones: [],
  ...over,
});

const useLocationsValue = (over: Record<string, unknown>) => ({
  locations: [],
  activeLocationIds: [],
  select: jest.fn(),
  selectedId: '',
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('useLocationDraft', () => {
  it('coalesces an empty country/state on the matched location to the tree default', () => {
    mockedLoc.mockReturnValue(
      useLocationsValue({
        locations: [loc({ country: '', state: '', state_code: '', country_code: '' })],
        selectedId: 'l1',
      }),
    );
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    expect(result.current.country).toBe('Other'); // empty country → tree[0].country
  });

  it('falls back to empty strings when there are no locations at all', () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [] }));
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    expect(result.current.country).toBe('');
    expect(result.current.state).toBe('');
  });

  it('clears the state when switching to an unknown country', () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})] }));
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.pickCountry('Atlantis'));
    expect(typeof result.current.state).toBe('string');
  });

  it('applies and closes when the detected city has live pods', async () => {
    const select = jest.fn();
    const onClose = jest.fn();
    mockedLoc.mockReturnValue(
      useLocationsValue({
        locations: [loc({ location_zones: [{ zone_name: 'Z1', pincode: '999' }] })],
        activeLocationIds: ['l1'],
        select,
      }),
    );
    reverse.mockResolvedValue([{ city: 'Town', postalCode: '999' }]);
    const { result } = renderHook(() => useLocationDraft(true, onClose));
    await act(async () => {
      await result.current.detect();
    });
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }), 'Z1');
    expect(onClose).toHaveBeenCalled();
  });

  it('applies a code-less active match (empty country/state) via subregion', async () => {
    const select = jest.fn();
    const onClose = jest.fn();
    mockedLoc.mockReturnValue(
      useLocationsValue({
        locations: [loc({ country: '', state: '', location_zones: [] })],
        activeLocationIds: ['l1'],
        select,
      }),
    );
    reverse.mockResolvedValue([{ subregion: 'Town', postalCode: '999' }]);
    const { result } = renderHook(() => useLocationDraft(true, onClose));
    await act(async () => {
      await result.current.detect();
    });
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1' }), '');
    expect(onClose).toHaveBeenCalled();
  });

  it('warns when the detected city has no live pods', async () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})], activeLocationIds: [] }));
    reverse.mockResolvedValue([{ subregion: 'Town', postalCode: '999' }]);
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    await act(async () => {
      await result.current.detect();
    });
    expect(result.current.draftId).toBe('l1');
    expect(result.current.error).toMatch(/No live pods/);
  });

  it('errors when the detected city is not a Duncit location', async () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})] }));
    reverse.mockResolvedValue([{ city: 'Atlantis' }]);
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    await act(async () => {
      await result.current.detect();
    });
    expect(result.current.error).toMatch(/isn't in Atlantis/);
  });

  it('errors generically when neither city nor subregion is returned', async () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})] }));
    reverse.mockResolvedValue([{}]);
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    await act(async () => {
      await result.current.detect();
    });
    expect(result.current.error).toMatch(/your area/);
  });

  it('surfaces a permission denial', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})] }));
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    await act(async () => {
      await result.current.detect();
    });
    expect(result.current.error).toMatch(/permission/i);
  });

  it('reports a failure when reverse geocoding throws', async () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})] }));
    reverse.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    await act(async () => {
      await result.current.detect();
    });
    expect(result.current.error).toMatch(/Could not detect/);
  });

  it('does not seed the draft while the sheet is closed', () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})], selectedId: 'l1' }));
    const { result } = renderHook(() => useLocationDraft(false, jest.fn()));
    expect(result.current.draftId).toBe('');
  });

  it('apply is a no-op when nothing is drafted', () => {
    const select = jest.fn();
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({})], selectedId: '', select }));
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.apply());
    expect(select).not.toHaveBeenCalled();
  });

  it("resets the city to the new state's first city when the state changes (BUG-3)", () => {
    mockedLoc.mockReturnValue(
      useLocationsValue({
        locations: [
          loc({ id: 'l1', state: 'Goa', location_name: 'Panaji' }),
          loc({ id: 'l2', state: 'Goa', location_name: 'Margao' }),
          loc({ id: 'l3', state: 'Kerala', location_name: 'Kochi', location_zones: [] }),
        ],
      }),
    );
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.setState('Kerala'));
    expect(result.current.state).toBe('Kerala');
    expect(result.current.draftId).toBe('l3');
    expect(result.current.draftZone).toBe('');
  });

  it('leaves the draft untouched for a state with no cities (BUG-3)', () => {
    mockedLoc.mockReturnValue(
      useLocationsValue({ locations: [loc({ id: 'l1' })], selectedId: 'l1' }),
    );
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.setState('Nowhere'));
    expect(result.current.draftId).toBe('l1');
  });

  it("selects the new country's first city on country change (BUG-3)", () => {
    mockedLoc.mockReturnValue(
      useLocationsValue({
        locations: [
          loc({
            id: 'l1',
            country: 'India',
            country_code: 'IN',
            state: 'Goa',
            location_name: 'Panaji',
          }),
          loc({
            id: 'l2',
            country: 'Nepal',
            country_code: 'NP',
            state: 'Bagmati',
            location_name: 'Kathmandu',
          }),
        ],
      }),
    );
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.pickCountry('Nepal'));
    expect(result.current.draftId).toBe('l2');
    expect(result.current.draftZone).toBe('');
  });

  it('picks a city into the draft and clears the zone', () => {
    mockedLoc.mockReturnValue(useLocationsValue({ locations: [loc({}), loc({ id: 'l2' })] }));
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.pickCity(loc({ id: 'l2' })));
    expect(result.current.draftId).toBe('l2');
    expect(result.current.draftZone).toBe('');
  });

  it('applies the draft selection on confirm', () => {
    const select = jest.fn();
    mockedLoc.mockReturnValue(
      useLocationsValue({ locations: [loc({})], selectedId: 'l1', select }),
    );
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.apply());
    expect(select).toHaveBeenCalled();
  });
});
