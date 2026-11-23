import type { UserPlatform } from '@duncit/gql-types';

type Translate = (key: string) => string;

/** Display order, the same one the server answers `platforms_used` in. */
export const PLATFORM_ORDER: readonly UserPlatform[] = ['ANDROID', 'IOS', 'WEB'];

/** The platform's name. Every key is written out so the translation gate can see it. */
export function platformLabel(platform: UserPlatform, t: Translate): string {
  if (platform === 'ANDROID') return t('admin.users.platformAndroid');
  if (platform === 'IOS') return t('admin.users.platformIos');
  return t('admin.users.platformWeb');
}

/** The Platforms Used filter: any of the picked platforms. */
export const platformOptions = (t: Translate) =>
  PLATFORM_ORDER.map((platform) => ({ value: platform, label: platformLabel(platform, t) }));

/** The platforms as text, for the grid's quick filter, copy and export. */
export const platformsValue = (platforms: readonly UserPlatform[] | null | undefined, t: Translate) =>
  (platforms ?? []).map((platform) => platformLabel(platform, t)).join(', ');
