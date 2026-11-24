import { useMemo } from 'react';
import { useTranslation, type Translate } from '../i18n/useTranslation';

/**
 * Where an account uses Duncit from, in display order — the same order the
 * server answers `platforms_used` in (`UserPlatform` in the GraphQL schema).
 */
export const USER_PLATFORMS = ['ANDROID', 'IOS', 'WEB'] as const;
export type UserPlatformKey = (typeof USER_PLATFORMS)[number];

/** The platform's name. Every key is written out so the translation gate can see it. */
export function platformLabel(platform: UserPlatformKey, t: Translate): string {
  if (platform === 'ANDROID') return t('ui.platforms.android');
  if (platform === 'IOS') return t('ui.platforms.ios');
  return t('ui.platforms.web');
}

/** The platforms in display order, whatever order (and duplicates) they came in. */
export function orderedPlatforms(platforms: readonly string[] | null | undefined): UserPlatformKey[] {
  const used = new Set(platforms ?? []);
  return USER_PLATFORMS.filter((platform) => used.has(platform));
}

/** What a table needs from the platforms: filter options and the text a cell copies and exports. */
export interface PlatformText {
  /** The "any of the picked platforms" filter's options. */
  options: { value: UserPlatformKey; label: string }[];
  /** "Android, Web" — for quick filter, copy and export. */
  valueText: (platforms: readonly string[] | null | undefined) => string;
}

/** Platform names in the viewer's language, for tables that filter or export by platform. */
export function usePlatformText(): PlatformText {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      options: USER_PLATFORMS.map((platform) => ({ value: platform, label: platformLabel(platform, t) })),
      valueText: (platforms) =>
        orderedPlatforms(platforms)
          .map((platform) => platformLabel(platform, t))
          .join(', '),
    }),
    [t],
  );
}
