import { Platform } from 'react-native';

import { displayLocalNotification } from '@/services/local-notifications';

const mockRequestPermissions = jest.fn();
const mockSetChannel = jest.fn();
const mockSchedule = jest.fn();
jest.mock('expo-notifications', () => ({
  __esModule: true,
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetChannel(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  AndroidImportance: { HIGH: 4 },
}));

const opts = { id: 'n1', title: 'T', body: 'B' };

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestPermissions.mockResolvedValue({ granted: true });
  mockSetChannel.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue(undefined);
});

describe('displayLocalNotification', () => {
  it('displays through expo-notifications on the Duncit channel', async () => {
    await expect(displayLocalNotification(opts)).resolves.toBe(true);
    expect(mockSetChannel).toHaveBeenCalledWith(
      'duncit-updates',
      expect.objectContaining({ name: 'Duncit updates', importance: 4 }),
    );
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'n1',
        content: expect.objectContaining({ title: 'T', body: 'B' }),
        trigger: null,
      }),
    );
  });

  it('returns false (no notification) when permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    await expect(displayLocalNotification(opts)).resolves.toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does nothing on the web target', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      await expect(displayLocalNotification(opts)).resolves.toBe(false);
      expect(mockSchedule).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('degrades silently when the native module is unavailable', async () => {
    mockRequestPermissions.mockRejectedValue(new Error('no native module'));
    await expect(displayLocalNotification(opts)).resolves.toBe(false);
  });
});
