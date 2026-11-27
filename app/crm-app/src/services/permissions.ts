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
export type RuntimeGroup = (typeof RUNTIME_GROUPS)[number];

export type PermissionState = Record<PermissionGroup, boolean>;

const granted = async (group: RuntimeGroup) =>
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

/** Whether the app may see the phone's audio files — without it no call recording is ever found. */
export const hasAudioAccess = (): Promise<boolean> => granted('audio');

/**
 * What the switched-on call features need from Android: the call log and
 * calling, notifications for the post-call card, and the audio files while
 * recordings are on (a recording the app cannot see is never uploaded).
 */
export const setupGroups = (recordings: boolean): RuntimeGroup[] =>
  recordings ? [...RUNTIME_GROUPS] : ['phone', 'call', 'notifications'];

/** The call features can work: phone and calling, and audio access while recordings are on. */
export const isSetUp = (state: PermissionState, recordings: boolean): boolean =>
  state.phone && state.call && (!recordings || state.audio);

/**
 * Ask for every permission of these groups in one system flow (Home's Set up).
 * One the person refused for good can only be given in Settings, so that opens.
 */
export async function requestGroups(groups: readonly RuntimeGroup[]): Promise<void> {
  const all = groups.flatMap((group) => permissionsFor(group));
  if (all.length === 0) return;
  const result = await PermissionsAndroid.requestMultiple(all);
  if (Object.values(result).includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN))
    await Linking.openSettings();
}

/** Ask for one group. A permission the person refused for good can only be given in Settings. */
export async function requestPermission(group: PermissionGroup): Promise<void> {
  if (group === 'overlay') {
    CrmTelephony?.openOverlaySettings();
    return;
  }
  await requestGroups([group]);
}
