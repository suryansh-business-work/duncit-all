import { getSelectedVenueId, setSelectedVenueId } from '@/services/selected-venue';
import { getItem, setItem } from '@/services/secure-storage';

jest.mock('@/services/secure-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('selected-venue service', () => {
  it('returns the saved venue id', async () => {
    mockGet.mockResolvedValueOnce('v1');
    expect(await getSelectedVenueId()).toBe('v1');
    expect(mockGet).toHaveBeenCalledWith('duncit.selected_venue');
  });

  it('returns null when nothing (or an empty value) was saved', async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await getSelectedVenueId()).toBeNull();
    mockGet.mockResolvedValueOnce('');
    expect(await getSelectedVenueId()).toBeNull();
  });

  it('persists a venue id', async () => {
    mockSet.mockResolvedValueOnce(undefined);
    await setSelectedVenueId('v2');
    expect(mockSet).toHaveBeenCalledWith('duncit.selected_venue', 'v2');
  });
});
