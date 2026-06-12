import { Platform } from 'react-native';

/**
 * Device notifications via Notifee (B3-3). The module is native-only, so it
 * loads lazily (and never on the web target); failures — e.g. Expo Go without
 * the native module — degrade silently to in-app-only notifications.
 */
export async function displayLocalNotification(opts: {
  id: string;
  title: string;
  body: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native-only module
    const notifee = require('@notifee/react-native') as typeof import('@notifee/react-native');
    await notifee.default.requestPermission();
    const channelId = await notifee.default.createChannel({
      id: 'duncit-updates',
      name: 'Duncit updates',
      importance: notifee.AndroidImportance.HIGH,
    });
    await notifee.default.displayNotification({
      id: opts.id,
      title: opts.title,
      body: opts.body,
      android: { channelId, pressAction: { id: 'default' } },
    });
    return true;
  } catch {
    return false;
  }
}
