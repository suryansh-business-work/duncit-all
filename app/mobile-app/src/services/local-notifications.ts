import { Platform } from 'react-native';

/**
 * Device notifications via expo-notifications (B3-3). The native module loads
 * lazily (and never on the web target); failures — e.g. Expo Go without the
 * native module — degrade silently to in-app-only notifications.
 *
 * expo-notifications replaces the now-unmaintained @notifee/react-native and
 * supports the New Architecture.
 */
export async function displayLocalNotification(opts: {
  id: string;
  title: string;
  body: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native-only module
    const Notifications: typeof import('expo-notifications') = require('expo-notifications');
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return false;
    // No-op on iOS; sets the high-importance channel for heads-up alerts on Android.
    await Notifications.setNotificationChannelAsync('duncit-updates', {
      name: 'Duncit updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.scheduleNotificationAsync({
      identifier: opts.id,
      content: { title: opts.title, body: opts.body },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
