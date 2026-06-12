import { getStudioMode, setStudioMode } from '@/services/studio-mode';
import { getItem, setItem } from '@/services/secure-storage';

jest.mock('@/services/secure-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('studio-mode service', () => {
  it('returns a valid persisted mode', async () => {
    mockGet.mockResolvedValueOnce('HOST');
    expect(await getStudioMode()).toBe('HOST');
  });

  it('returns null for missing or invalid values', async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await getStudioMode()).toBeNull();
    mockGet.mockResolvedValueOnce('NONSENSE');
    expect(await getStudioMode()).toBeNull();
  });

  it('persists a mode', async () => {
    mockSet.mockResolvedValueOnce(undefined);
    await setStudioMode('VENUE');
    expect(mockSet).toHaveBeenCalledWith('duncit.studio_mode', 'VENUE');
  });
});
