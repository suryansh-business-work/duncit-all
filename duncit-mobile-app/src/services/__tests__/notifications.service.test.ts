import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  handleNotification,
  registerForPushNotifications,
  scheduleLocalNotification,
} from '@/services/notifications.service';
import { ApiError } from '@/utils/errors';

jest.mock('expo-notifications');

const mockedNotifications = jest.mocked(Notifications);

describe('notifications.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  it('returns the push token when permission is granted', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExpoToken[abc]',
    } as never);

    await expect(registerForPushNotifications()).resolves.toBe('ExpoToken[abc]');
  });

  it('requests permission when not already granted', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as never);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExpoToken[xyz]',
    } as never);

    await expect(registerForPushNotifications()).resolves.toBe('ExpoToken[xyz]');
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('returns null when permission is denied', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);

    await expect(registerForPushNotifications()).resolves.toBeNull();
  });

  it('configures an Android channel', async () => {
    Platform.OS = 'android';
    mockedNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'tok' } as never);

    await registerForPushNotifications();
    expect(mockedNotifications.setNotificationChannelAsync).toHaveBeenCalled();
  });

  it('schedules a local notification', async () => {
    mockedNotifications.scheduleNotificationAsync.mockResolvedValue('notif_1' as never);
    await expect(scheduleLocalNotification('Hi', 'Body', 5)).resolves.toBe('notif_1');
  });

  it('rejects a delay below one second', async () => {
    await expect(scheduleLocalNotification('Hi', 'Body', 0)).rejects.toBeInstanceOf(ApiError);
  });

  it('exposes a notification handler that shows banners', async () => {
    const behavior = await handleNotification();
    expect(behavior).toMatchObject({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
    });
  });
});
