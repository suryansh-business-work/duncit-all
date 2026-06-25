import { Platform } from 'react-native';

import {
  MobileDeleteExpoPushTokenDocument,
  MobileSaveExpoPushTokenDocument,
} from '@/graphql/notification';
import { getItem, removeItem, setItem } from '@/services/secure-storage';
import { graphqlRequest } from '@/services/graphql.client';
import { registerForPushNotifications } from '@/services/notifications.service';
import { removeExpoPushToken, syncExpoPushToken } from '@/services/push-registration';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/notifications.service', () => ({
  registerForPushNotifications: jest.fn(),
}));
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockRegister = registerForPushNotifications as jest.Mock;
const mockRequest = graphqlRequest as jest.Mock;
const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;
const mockRemove = removeItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  mockRequest.mockResolvedValue(true);
  mockSet.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

describe('syncExpoPushToken', () => {
  it('persists and registers the Expo token with the platform', async () => {
    mockRegister.mockResolvedValue('ExpoToken[abc]');
    await syncExpoPushToken();
    expect(mockSet).toHaveBeenCalledWith('duncit.push.token', 'ExpoToken[abc]');
    expect(mockRequest).toHaveBeenCalledWith(
      MobileSaveExpoPushTokenDocument,
      { token: 'ExpoToken[abc]', platform: 'ios' },
      { auth: true },
    );
  });

  it('does nothing when permission yields no token', async () => {
    mockRegister.mockResolvedValue(null);
    await syncExpoPushToken();
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('swallows a registration failure', async () => {
    mockRegister.mockRejectedValue(new Error('no permission'));
    await expect(syncExpoPushToken()).resolves.toBeUndefined();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('removeExpoPushToken', () => {
  it('clears and unbinds a stored token', async () => {
    mockGet.mockResolvedValue('ExpoToken[abc]');
    await removeExpoPushToken();
    expect(mockRemove).toHaveBeenCalledWith('duncit.push.token');
    expect(mockRequest).toHaveBeenCalledWith(
      MobileDeleteExpoPushTokenDocument,
      { token: 'ExpoToken[abc]' },
      { auth: true },
    );
  });

  it('does nothing when no token is stored', async () => {
    mockGet.mockResolvedValue(null);
    await removeExpoPushToken();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('swallows an unbind failure', async () => {
    mockGet.mockResolvedValue('ExpoToken[abc]');
    mockRequest.mockRejectedValue(new Error('network'));
    await expect(removeExpoPushToken()).resolves.toBeUndefined();
  });
});
