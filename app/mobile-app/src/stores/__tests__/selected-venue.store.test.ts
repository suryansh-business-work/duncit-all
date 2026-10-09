import { logs } from '@duncit/logs';

import { useSelectedVenueStore } from '@/stores/selected-venue.store';
import { getSelectedVenueId, setSelectedVenueId } from '@/services/selected-venue';

jest.mock('@/services/selected-venue', () => ({
  getSelectedVenueId: jest.fn(),
  setSelectedVenueId: jest.fn(),
}));
const mockGet = getSelectedVenueId as jest.Mock;
const mockSet = setSelectedVenueId as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useSelectedVenueStore.setState({ venueId: null, status: 'idle' });
});

describe('selected-venue store', () => {
  it('hydrates the persisted pick once', async () => {
    mockGet.mockResolvedValueOnce('v2');
    await useSelectedVenueStore.getState().hydrate();
    expect(useSelectedVenueStore.getState()).toMatchObject({ venueId: 'v2', status: 'ready' });

    await useSelectedVenueStore.getState().hydrate();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('keeps a pick made while the saved one is still being read', async () => {
    let resolve!: (value: string | null) => void;
    mockGet.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    mockSet.mockResolvedValueOnce(undefined);
    const hydrating = useSelectedVenueStore.getState().hydrate();
    useSelectedVenueStore.getState().select('v3');
    resolve('v1');
    await hydrating;
    expect(useSelectedVenueStore.getState().venueId).toBe('v3');
  });

  it('selects and persists a venue', () => {
    mockSet.mockResolvedValueOnce(undefined);
    useSelectedVenueStore.getState().select('v9');
    expect(useSelectedVenueStore.getState()).toMatchObject({ venueId: 'v9', status: 'ready' });
    expect(mockSet).toHaveBeenCalledWith('v9');
  });

  it('logs — not swallows — a failed read or write, and still works', async () => {
    const error = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
    mockGet.mockRejectedValueOnce(new Error('locked'));
    await useSelectedVenueStore.getState().hydrate();
    expect(useSelectedVenueStore.getState()).toMatchObject({ venueId: null, status: 'ready' });
    expect(error).toHaveBeenCalledWith('selected-venue', 'hydrate', expect.anything());

    mockSet.mockRejectedValueOnce(new Error('full'));
    useSelectedVenueStore.getState().select('v4');
    await Promise.resolve();
    await Promise.resolve();
    expect(useSelectedVenueStore.getState().venueId).toBe('v4');
    expect(error).toHaveBeenCalledWith('selected-venue', 'persist', expect.anything());
    error.mockRestore();
  });
});
