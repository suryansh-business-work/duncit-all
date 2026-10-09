import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useSelectedVenue } from '@/hooks/useSelectedVenue';
import { getSelectedVenueId, setSelectedVenueId } from '@/services/selected-venue';
import { useSelectedVenueStore } from '@/stores/selected-venue.store';

jest.mock('@/services/selected-venue', () => ({
  getSelectedVenueId: jest.fn(),
  setSelectedVenueId: jest.fn(),
}));
const mockGet = getSelectedVenueId as jest.Mock;
const mockSet = setSelectedVenueId as jest.Mock;

const VENUES = [
  { id: 'v1', venue_name: 'Hall', status: 'APPROVED' },
  { id: 'v2', venue_name: 'Turf', status: 'APPROVED' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockSet.mockResolvedValue(undefined);
  useSelectedVenueStore.setState({ venueId: null, status: 'idle' });
});

describe('useSelectedVenue', () => {
  it('opens on the venue saved on an earlier visit', async () => {
    mockGet.mockResolvedValueOnce('v2');
    const { result } = renderHook(() => useSelectedVenue(VENUES));
    await waitFor(() => expect(result.current.venueId).toBe('v2'));
    expect(result.current.venue?.venue_name).toBe('Turf');
  });

  it('falls back to the default venue when the saved one is gone', async () => {
    mockGet.mockResolvedValueOnce('deleted');
    const { result } = renderHook(() => useSelectedVenue(VENUES));
    await waitFor(() => expect(useSelectedVenueStore.getState().status).toBe('ready'));
    expect(result.current.venueId).toBe('v1');
  });

  it('carries a pick to every other screen reading it, and persists it', async () => {
    mockGet.mockResolvedValueOnce(null);
    const first = renderHook(() => useSelectedVenue(VENUES));
    const second = renderHook(() => useSelectedVenue(VENUES));
    await waitFor(() => expect(useSelectedVenueStore.getState().status).toBe('ready'));
    expect(mockGet).toHaveBeenCalledTimes(1);

    act(() => first.result.current.selectVenue('v2'));
    expect(second.result.current.venueId).toBe('v2');
    expect(mockSet).toHaveBeenCalledWith('v2');
  });

  it('has no venue while the owner has none', async () => {
    mockGet.mockResolvedValueOnce('v1');
    const { result } = renderHook(() => useSelectedVenue([]));
    await waitFor(() => expect(useSelectedVenueStore.getState().status).toBe('ready'));
    expect(result.current).toMatchObject({ venue: null, venueId: null });
  });
});
