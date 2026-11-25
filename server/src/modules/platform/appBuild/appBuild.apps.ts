import type { AppBuildApp, AppBuildEnv, AppBuildPlatform } from './appBuild.model';

/**
 * The app dimension of a build. One repository builds two apps, each for
 * Android and iOS — the member app (app/mobile-app) and the internal Duncit CRM
 * app (app/crm-app) — and every list, changelog base and Slack post has to keep
 * them apart.
 *
 * Rows written before the field existed carry no `app`, and every one of them
 * is the member app, so "the member app" is matched as "anything that is not
 * CRM" rather than as an exact value.
 */

/** What a report said, as an app. Anything unrecognised (an older reporter) is the member app. */
export function appOf(raw: unknown): AppBuildApp {
  return String(raw ?? '').trim().toUpperCase() === 'CRM' ? 'CRM' : 'DUNCIT';
}

/** The Mongo filter for one app's rows. Left out, the member app — which is what every caller meant before. */
export function appFilter(app?: AppBuildApp | null): Record<string, unknown> {
  return app === 'CRM' ? { app: 'CRM' } : { app: { $ne: 'CRM' } };
}

/** Prefix for headlines and "no channel" notices: the member app reads exactly as it always has. */
export function appLabel(app?: AppBuildApp | null): string {
  return app === 'CRM' ? 'Duncit CRM ' : '';
}

/**
 * Where CRM builds are announced, one channel per environment (chosen in the
 * CRM portal's Download CRM App → Settings, or Tech → App Builds → Settings).
 * The channel carries both platforms' CRM builds; the keys keep their original
 * ANDROID names because deployed env entries are stored under them.
 */
export const CRM_CHANNEL_ENV_KEYS: Record<AppBuildEnv, string> = {
  PRODUCTION: 'SLACK_CRM_ANDROID_BUILDS_CHANNEL',
  STAGING: 'SLACK_CRM_ANDROID_STAGING_BUILDS_CHANNEL',
};

/** The env entry config fields behind those two keys (SLACK category). */
export const CRM_CHANNEL_CONFIG_FIELDS: Record<AppBuildEnv, string> = {
  PRODUCTION: 'config.crm_android_builds_channel',
  STAGING: 'config.crm_android_staging_builds_channel',
};

/** The workflow that builds the CRM app, per platform. */
export const CRM_WORKFLOW_FILES: Record<AppBuildPlatform, string> = {
  ANDROID: 'crm-android-build.yml',
  IOS: 'crm-ios-build.yml',
};

/**
 * The runtime env keys a build's announcement may go to, best first. Each
 * blank one falls through to the next, so choosing nothing loses no post:
 *   CRM staging → CRM production → member staging → member production.
 */
export function channelKeysFor(
  build: { platform: AppBuildPlatform; app_env: AppBuildEnv; app?: AppBuildApp | null },
  member: { production: Record<AppBuildPlatform, string>; staging: Record<AppBuildPlatform, string> }
): string[] {
  const staging = build.app_env === 'STAGING';
  const keys: string[] = [];
  if (build.app === 'CRM') {
    if (staging) keys.push(CRM_CHANNEL_ENV_KEYS.STAGING);
    keys.push(CRM_CHANNEL_ENV_KEYS.PRODUCTION);
  }
  if (staging) keys.push(member.staging[build.platform]);
  keys.push(member.production[build.platform]);
  return keys;
}
