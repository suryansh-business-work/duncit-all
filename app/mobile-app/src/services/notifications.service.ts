import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ApiError } from '@/utils/errors';

/** Whether a push is a pod or club room's (its tag is `chat:<room>`). */
function isChatRoomPush(notification?: Notifications.Notification): boolean {
  const tag: unknown = notification?.request?.content?.data?.tag;
  return typeof tag === 'string' && tag.startsWith('chat:');
}

/**
 * Foreground presentation behaviour for incoming notifications. A chat room's
 * push stays in the list but makes no banner or sound while the app is open:
 * the in-app banner and ping (`chat:new`) have already said it.
 */
export async function handleNotification(
  notification?: Notifications.Notification,
): Promise<Notifications.NotificationBehavior> {
  const roomPush = isChatRoomPush(notification);
  return {
    shouldShowBanner: !roomPush,
    shouldShowList: true,
    shouldPlaySound: !roomPush,
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
