import * as SecureStore from 'expo-secure-store';

import { clearAuthToken, getAuthToken, setAuthToken } from '@/services/auth-token';

jest.mock('expo-secure-store');

const mockedStore = jest.mocked(SecureStore);
const TOKEN_KEY = 'duncit.auth.token';

describe('auth-token store', () => {
  afterEach(() => jest.clearAllMocks());

  it('reads the token from secure store', async () => {
    mockedStore.getItemAsync.mockResolvedValue('stored-token');
    await expect(getAuthToken()).resolves.toBe('stored-token');
    expect(mockedStore.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it('writes the token to secure store', async () => {
    mockedStore.setItemAsync.mockResolvedValue();
    await setAuthToken('new-token');
    expect(mockedStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'new-token');
  });

  it('clears the token from secure store', async () => {
    mockedStore.deleteItemAsync.mockResolvedValue();
    await clearAuthToken();
    expect(mockedStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });
});
