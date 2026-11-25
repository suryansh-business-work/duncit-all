import { Linking, PermissionsAndroid, Platform, type Permission } from 'react-native';
import { CrmTelephony } from 'crm-telephony';

/**
 * Whether this phone has the call features at all. Their native side
 * (modules/crm-telephony) is Android only: an iPhone does not let apps read
 * the call log, so there the app leaves out caller ID, call logging, the
 * Android permissions, the home-screen icon and the background sync. The
 * dialer still opens the phone's own dialer, and the CRM call line still works.
 */
export const hasPhoneFeatures = (): boolean => CrmTelephony !== null;

/**
 * The phone permissions the call features need, grouped the way Settings
 * shows them. Each one is asked for only when the person taps Allow.
 */
export type PermissionGroup = 'phone' | 'call' | 'notifications' | 'audio' | 'overlay';

const P = PermissionsAndroid.PERMISSIONS;
const sdk = typeof Platform.Version === 'number' ? Platform.Version : 0;

/** Android runtime permissions per group; `overlay` is a special app access, handled apart. */
export function permissionsFor(
  group: Exclude<PermissionGroup, 'overlay'>,
  apiLevel = sdk,
): Permission[] {
  switch (group) {
    case 'phone':
      return [P.READ_PHONE_STATE, P.READ_CALL_LOG];
    case 'call':
      return [P.CALL_PHONE];
    case 'notifications':
      return apiLevel >= 33 ? [P.POST_NOTIFICATIONS] : [];
    case 'audio':
      return [apiLevel >= 33 ? P.READ_MEDIA_AUDIO : P.READ_EXTERNAL_STORAGE];
  }
}

export const RUNTIME_GROUPS = ['phone', 'call', 'notifications', 'audio'] as const;

export type PermissionState = Record<PermissionGroup, boolean>;

const granted = async (group: (typeof RUNTIME_GROUPS)[number]) =>
  (await Promise.all(permissionsFor(group).map((p) => PermissionsAndroid.check(p)))).every(Boolean);

export async function readPermissions(): Promise<PermissionState> {
  const [phone, call, notifications, audio] = await Promise.all([
    granted('phone'),
    granted('call'),
    granted('notifications'),
    granted('audio'),
  ]);
  return { phone, call, notifications, audio, overlay: CrmTelephony?.canDrawOverlays() ?? false };
}

/** Ask for one group. A permission the person refused for good can only be given in Settings. */
export async function requestPermission(group: PermissionGroup): Promise<void> {
  if (group === 'overlay') {
    CrmTelephony?.openOverlaySettings();
    return;
  }
  const result = await PermissionsAndroid.requestMultiple(permissionsFor(group));
  if (Object.values(result).includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN))
    await Linking.openSettings();
}
