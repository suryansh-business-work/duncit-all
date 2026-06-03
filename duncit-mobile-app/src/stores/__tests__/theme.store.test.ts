import { getThemePref, setThemePref } from '@/services/theme';
import { useThemeStore } from '@/stores/theme.store';

jest.mock('@/services/theme');
const mockGet = jest.mocked(getThemePref);
const mockSet = jest.mocked(setThemePref);

beforeEach(() => {
  jest.clearAllMocks();
  mockSet.mockResolvedValue();
  useThemeStore.setState({ scheme: 'light', hydrated: false });
});

describe('theme.store', () => {
  it('hydrates from the persisted preference', async () => {
    mockGet.mockResolvedValue('dark');
    await useThemeStore.getState().hydrate();
    expect(useThemeStore.getState()).toMatchObject({ scheme: 'dark', hydrated: true });
  });

  it('defaults to light when nothing is persisted', async () => {
    mockGet.mockResolvedValue(null);
    await useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().scheme).toBe('light');
  });

  it('toggles the scheme and persists the choice', () => {
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().scheme).toBe('dark');
    expect(mockSet).toHaveBeenCalledWith('dark');
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().scheme).toBe('light');
  });
});
