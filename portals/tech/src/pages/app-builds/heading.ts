import type { AppBuildApp, AppBuildPlatform } from './queries';

type Translate = (key: string) => string;

/** The title and subtitle of one App Builds table: per platform, and per app (member app or Duncit CRM). */
export function appBuildsHeading(t: Translate, platform: AppBuildPlatform, app: AppBuildApp) {
  if (app === 'CRM') {
    return platform === 'ANDROID'
      ? { title: t('tech.appBuilds.crmTitle'), subtitle: t('tech.appBuilds.crmSubtitle') }
      : { title: t('tech.appBuilds.crmIosTitle'), subtitle: t('tech.appBuilds.crmIosSubtitle') };
  }
  return platform === 'ANDROID'
    ? { title: t('tech.appBuilds.androidTitle'), subtitle: t('tech.appBuilds.androidSubtitle') }
    : { title: t('tech.appBuilds.iosTitle'), subtitle: t('tech.appBuilds.iosSubtitle') };
}
