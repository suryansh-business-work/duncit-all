import { useStudioModeStore } from '@/stores/studio-mode.store';
import { getStudioMode, setStudioMode } from '@/services/studio-mode';

jest.mock('@/services/studio-mode', () => ({ getStudioMode: jest.fn(), setStudioMode: jest.fn() }));
const mockGet = getStudioMode as jest.Mock;
const mockSet = setStudioMode as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useStudioModeStore.setState({ mode: 'USER', hydrated: false });
});

describe('studio-mode store', () => {
  it('hydrates a persisted mode', async () => {
    mockGet.mockResolvedValueOnce('HOST');
    await useStudioModeStore.getState().hydrate();
    expect(useStudioModeStore.getState().mode).toBe('HOST');
    expect(useStudioModeStore.getState().hydrated).toBe(true);
  });

  it('defaults to USER when nothing is persisted', async () => {
    mockGet.mockResolvedValueOnce(null);
    await useStudioModeStore.getState().hydrate();
    expect(useStudioModeStore.getState().mode).toBe('USER');
  });

  it('sets and persists the mode', () => {
    mockSet.mockResolvedValueOnce(undefined);
    useStudioModeStore.getState().setMode('VENUE');
    expect(useStudioModeStore.getState().mode).toBe('VENUE');
    expect(mockSet).toHaveBeenCalledWith('VENUE');
  });

  it('keeps the new mode even if persistence fails', async () => {
    mockSet.mockRejectedValueOnce(new Error('nope'));
    useStudioModeStore.getState().setMode('HOST');
    await Promise.resolve();
    expect(useStudioModeStore.getState().mode).toBe('HOST');
  });
});
