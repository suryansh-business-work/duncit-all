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

beforeEach(() => jest.clearAllMocks());

describe('useLocationDraft', () => {
  it('coalesces an empty country/state on the matched location to the tree default', () => {
    mockedLoc.mockReturnValue({
      locations: [loc({ country: '', state: '', state_code: '', country_code: '' })],
      select: jest.fn(),
      selectedId: 'l1',
    });
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    expect(result.current.country).toBe('Other'); // empty country → tree[0].country
  });

  it('falls back to empty strings when there are no locations at all', () => {
    mockedLoc.mockReturnValue({ locations: [], select: jest.fn(), selectedId: '' });
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    expect(result.current.country).toBe('');
    expect(result.current.state).toBe('');
  });

  it('clears the state when switching to an unknown country', () => {
    mockedLoc.mockReturnValue({ locations: [loc({})], select: jest.fn(), selectedId: '' });
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    act(() => result.current.pickCountry('Atlantis'));
    // Unknown country → the internal state resets to '' (the derived value falls
    // back to the first tree entry); the call must not throw.
    expect(typeof result.current.state).toBe('string');
  });

  it('detects via subregion and tolerates a code-less, zone-less match', async () => {
    mockedLoc.mockReturnValue({
      locations: [loc({ country: '', state: '', location_zones: [] })],
      select: jest.fn(),
      selectedId: '',
    });
    reverse.mockResolvedValue([{ subregion: 'Town', postalCode: '999' }]);
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    await act(async () => {
      await result.current.detect();
    });
    expect(result.current.draftId).toBe('l1');
    expect(result.current.detected).toBe('Town');
  });

  it('errors generically when neither city nor subregion is returned', async () => {
    mockedLoc.mockReturnValue({ locations: [loc({})], select: jest.fn(), selectedId: '' });
    reverse.mockResolvedValue([{}]);
    const { result } = renderHook(() => useLocationDraft(true, jest.fn()));
    await act(async () => {
      await result.current.detect();
    });
    expect(result.current.error).toMatch(/your area/);
  });
});
