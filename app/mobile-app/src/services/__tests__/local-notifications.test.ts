import { Platform } from 'react-native';

import { displayLocalNotification } from '@/services/local-notifications';

const mockRequestPermission = jest.fn();
const mockCreateChannel = jest.fn();
const mockDisplayNotification = jest.fn();
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: (...args: unknown[]) => mockRequestPermission(...args),
    createChannel: (...args: unknown[]) => mockCreateChannel(...args),
    displayNotification: (...args: unknown[]) => mockDisplayNotification(...args),
  },
  AndroidImportance: { HIGH: 4 },
}));

const opts = { id: 'n1', title: 'T', body: 'B' };

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestPermission.mockResolvedValue(undefined);
  mockCreateChannel.mockResolvedValue('duncit-updates');
  mockDisplayNotification.mockResolvedValue(undefined);
});

describe('displayLocalNotification', () => {
  it('displays through Notifee on native with the Duncit channel', async () => {
    await expect(displayLocalNotification(opts)).resolves.toBe(true);
    expect(mockCreateChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'duncit-updates' }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1', title: 'T', body: 'B' }),
    );
  });

  it('does nothing on the web target', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      await expect(displayLocalNotification(opts)).resolves.toBe(false);
      expect(mockDisplayNotification).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('degrades silently when the native module is unavailable', async () => {
    mockRequestPermission.mockRejectedValue(new Error('no native module'));
    await expect(displayLocalNotification(opts)).resolves.toBe(false);
  });
});
