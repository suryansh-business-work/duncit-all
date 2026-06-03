import * as SecureStore from 'expo-secure-store';

import { getThemePref, setThemePref } from '@/services/theme';

jest.mock('expo-secure-store');
const mockedGet = jest.mocked(SecureStore.getItemAsync);
const mockedSet = jest.mocked(SecureStore.setItemAsync);

afterEach(() => jest.clearAllMocks());

describe('theme preference store', () => {
  it('reads a valid persisted preference', async () => {
    mockedGet.mockResolvedValue('dark');
    expect(await getThemePref()).toBe('dark');
  });

  it('returns null for missing or invalid values', async () => {
    mockedGet.mockResolvedValue(null);
    expect(await getThemePref()).toBeNull();
    mockedGet.mockResolvedValue('purple');
    expect(await getThemePref()).toBeNull();
  });

  it('persists a preference', async () => {
    mockedSet.mockResolvedValue();
    await setThemePref('light');
    expect(mockedSet).toHaveBeenCalledWith('duncit.theme', 'light');
  });
});
