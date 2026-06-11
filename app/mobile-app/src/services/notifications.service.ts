import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ApiError } from '@/utils/errors';

/** Foreground presentation behaviour for incoming notifications. */
export async function handleNotification(): Promise<Notifications.NotificationBehavior> {
  return {
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  };
}

Notifications.setNotificationHandler({ handleNotification });

/** Requests push permission and returns the Expo push token, or null if unavailable. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

/** Schedules a local notification after the given delay (seconds). */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds = 1,
): Promise<string> {
  if (seconds < 1) {
    throw new ApiError('Notification delay must be at least one second.');
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}
