import { appFilter, appLabel, appOf, channelKeysFor, CRM_CHANNEL_ENV_KEYS, CRM_WORKFLOW_FILE } from '../../appBuild.apps';

/** Two apps share the build pipeline; these rules keep them apart. */

describe('appOf', () => {
  it.each([
    ['CRM', 'CRM'],
    [' crm ', 'CRM'],
    ['DUNCIT', 'DUNCIT'],
    ['', 'DUNCIT'],
    [null, 'DUNCIT'],
    [undefined, 'DUNCIT'],
    ['SOMETHING', 'DUNCIT'],
  ])('reads %p as %s', (raw, app) => {
    expect(appOf(raw)).toBe(app);
  });
});

describe('appFilter', () => {
  it('matches CRM rows exactly', () => {
    expect(appFilter('CRM')).toEqual({ app: 'CRM' });
  });

  it('matches the member app as anything that is not CRM, so rows from before the field still count', () => {
    expect(appFilter('DUNCIT')).toEqual({ app: { $ne: 'CRM' } });
    expect(appFilter(null)).toEqual({ app: { $ne: 'CRM' } });
    expect(appFilter()).toEqual({ app: { $ne: 'CRM' } });
  });
});

describe('appLabel', () => {
  it('names the CRM app and leaves the member app’s wording untouched', () => {
    expect(appLabel('CRM')).toBe('Duncit CRM ');
    expect(appLabel('DUNCIT')).toBe('');
    expect(appLabel(undefined)).toBe('');
  });
});

describe('channelKeysFor', () => {
  const member = {
    production: { ANDROID: 'ANDROID_PROD', IOS: 'IOS_PROD' },
    staging: { ANDROID: 'ANDROID_STAGING', IOS: 'IOS_STAGING' },
  };

  it('tries the CRM staging channel, then CRM production, then the member app channels', () => {
    expect(channelKeysFor({ platform: 'ANDROID', app_env: 'STAGING', app: 'CRM' }, member)).toEqual([
      CRM_CHANNEL_ENV_KEYS.STAGING,
      CRM_CHANNEL_ENV_KEYS.PRODUCTION,
      'ANDROID_STAGING',
      'ANDROID_PROD',
    ]);
    expect(channelKeysFor({ platform: 'ANDROID', app_env: 'PRODUCTION', app: 'CRM' }, member)).toEqual([
      CRM_CHANNEL_ENV_KEYS.PRODUCTION,
      'ANDROID_PROD',
    ]);
  });

  it('keeps the member app exactly as before: staging then production', () => {
    expect(channelKeysFor({ platform: 'IOS', app_env: 'STAGING', app: 'DUNCIT' }, member)).toEqual(['IOS_STAGING', 'IOS_PROD']);
    expect(channelKeysFor({ platform: 'ANDROID', app_env: 'PRODUCTION' }, member)).toEqual(['ANDROID_PROD']);
  });

  it('names the CRM keys and workflow', () => {
    expect(CRM_CHANNEL_ENV_KEYS).toEqual({ PRODUCTION: 'SLACK_CRM_ANDROID_BUILDS_CHANNEL', STAGING: 'SLACK_CRM_ANDROID_STAGING_BUILDS_CHANNEL' });
    expect(CRM_WORKFLOW_FILE).toBe('crm-android-build.yml');
  });
});
