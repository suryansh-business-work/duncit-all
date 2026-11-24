/**
 * Duncit CRM builds: one Slack channel per environment, chosen from the CRM
 * portal or the Tech portal, and CRM builds started from Tech → App Builds.
 */
const mockEnv: Record<string, string> = {};
jest.mock('@config/runtimeEnv', () => ({
  ...jest.requireActual('@config/runtimeEnv'),
  getRuntimeEnvValue: jest.fn(async (key: string) => mockEnv[key] ?? ''),
}));
jest.mock('@modules/platform/slack/slack.gateway', () => ({
  ...jest.requireActual('@modules/platform/slack/slack.gateway'),
  postMessage: jest.fn(),
}));
jest.mock('@modules/platform/slack/slack.service', () => ({
  slackService: { configured: jest.fn(), channels: jest.fn() },
}));
jest.mock('@utils/github-actions', () => ({
  ...jest.requireActual('@utils/github-actions'),
  dispatchWorkflow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/platform/appBuild/playRelease.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/playRelease.service'),
  playStoreSettings: jest.fn().mockResolvedValue({ configured: false, packageName: '' }),
}));
jest.mock('@modules/platform/appBuild/iosSigning.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/iosSigning.service'),
  appStoreSettings: jest.fn().mockResolvedValue({ configured: false, bundleId: '', signing: null }),
}));

import type { GraphQLContext } from '@context';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { slackService } from '@modules/platform/slack/slack.service';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { dispatchWorkflow } from '@utils/github-actions';
import { appBuildService } from '../../appBuild.service';
import { appBuildResolvers } from '../../appBuild.resolver';

const post = postMessage as jest.Mock;
const dispatch = dispatchWorkflow as jest.Mock;
const slack = slackService as unknown as { configured: jest.Mock; channels: jest.Mock };
const crmStaff = { user: { id: 'crm-1', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
const member = { user: { id: 'u-1', roles: ['USER'] } } as unknown as GraphQLContext;
const tech = { id: 'tech-1', email: 'ops@duncit.com', roles: ['TECH_MANAGER'] } as never;

const CHANNELS = [
  { id: 'C-CRM', name: 'crm-app', is_private: false, is_member: true, num_members: 4, topic: '', link: '' },
  { id: 'C-QA', name: 'crm-qa', is_private: true, is_member: false, num_members: 2, topic: '', link: '' },
];

const slackEntry = () =>
  EnvEntryModel.create({ name: 'Slack', category: 'SLACK', is_default: true, is_active: true, config: { android_builds_channel: 'C-ANDROID' } });

const crmBuild = (app_env: 'PRODUCTION' | 'STAGING') =>
  appBuildService.report(
    {
      platform: 'ANDROID',
      app: 'CRM',
      app_env,
      version: '1.0.0',
      status: 'SUCCESS',
      workflow_run_id: String(Math.random()).slice(2),
      artifacts: [{ kind: 'APK', name: 'crm.apk', url: 'https://server/app-builds/crm.apk' }],
    },
    'ci'
  );

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  jest.clearAllMocks();
  post.mockResolvedValue({ channel: 'C', ts: '1' });
  slack.configured.mockResolvedValue(true);
  slack.channels.mockResolvedValue(CHANNELS);
});

describe('announcing per environment', () => {
  it('posts staging CRM builds to the staging channel and production ones to production', async () => {
    mockEnv.SLACK_CRM_ANDROID_BUILDS_CHANNEL = 'C-CRM';
    mockEnv.SLACK_CRM_ANDROID_STAGING_BUILDS_CHANNEL = 'C-QA';
    await crmBuild('STAGING');
    await crmBuild('PRODUCTION');
    expect(post.mock.calls.map((c) => c[0].channel)).toEqual(['C-QA', 'C-CRM']);
  });

  it('sends staging builds to the CRM production channel until a staging one is chosen', async () => {
    mockEnv.SLACK_CRM_ANDROID_BUILDS_CHANNEL = 'C-CRM';
    mockEnv.SLACK_ANDROID_STAGING_BUILDS_CHANNEL = 'C-MEMBER-STAGING';
    await crmBuild('STAGING');
    expect(post.mock.calls[0][0].channel).toBe('C-CRM');
  });
});

describe('CRM portal settings', () => {
  it('shows both channels and the channels the bot can see', async () => {
    mockEnv.SLACK_CRM_ANDROID_BUILDS_CHANNEL = 'C-CRM';
    const settings = await appBuildResolvers.Query.crmAppBuildSettings({}, {}, crmStaff);
    expect(settings).toEqual({
      slack_configured: true,
      production_channel: 'C-CRM',
      staging_channel: null,
      channels: [
        { id: 'C-CRM', name: 'crm-app', is_private: false, is_member: true },
        { id: 'C-QA', name: 'crm-qa', is_private: true, is_member: false },
      ],
      channels_error: null,
    });
  });

  it('says why the channel list is missing instead of failing the page', async () => {
    slack.channels.mockRejectedValue(new Error('missing_scope'));
    const settings = await appBuildResolvers.Query.crmAppBuildSettings({}, {}, crmStaff);
    expect(settings).toMatchObject({ channels: [], channels_error: 'missing_scope' });
  });

  it('lists nothing while Slack is not connected', async () => {
    slack.configured.mockResolvedValue(false);
    const settings = await appBuildResolvers.Query.crmAppBuildSettings({}, {}, crmStaff);
    expect(settings).toMatchObject({ slack_configured: false, channels: [] });
    expect(slack.channels).not.toHaveBeenCalled();
  });

  it('saves both channels into the Slack env entry, the same fields Tech edits', async () => {
    const entry = await slackEntry();
    await appBuildResolvers.Mutation.updateCrmAppBuildSettings({}, { input: { production_channel: ' C-CRM ', staging_channel: 'C-QA' } }, crmStaff);
    const stored = await EnvEntryModel.findById(entry._id).lean<{ config: Record<string, string> }>();
    expect(stored?.config).toMatchObject({ crm_android_builds_channel: 'C-CRM', crm_android_staging_builds_channel: 'C-QA', android_builds_channel: 'C-ANDROID' });
  });

  it('clears a channel when it is left empty', async () => {
    const entry = await slackEntry();
    await appBuildResolvers.Mutation.updateCrmAppBuildSettings({}, { input: { staging_channel: '' } }, crmStaff);
    const stored = await EnvEntryModel.findById(entry._id).lean<{ config: Record<string, string> }>();
    expect(stored?.config.crm_android_staging_builds_channel).toBe('');
  });

  it('refuses a channel the bot cannot see, saving nothing', async () => {
    const entry = await slackEntry();
    await expect(
      appBuildResolvers.Mutation.updateCrmAppBuildSettings({}, { input: { production_channel: 'C-TYPO' } }, crmStaff)
    ).rejects.toThrow('Pick a channel the Duncit Slack bot can see.');
    const stored = await EnvEntryModel.findById(entry._id).lean<{ config: Record<string, string> }>();
    expect(stored?.config.crm_android_builds_channel).toBeUndefined();
  });

  it('is CRM staff only', () => {
    expect(() => appBuildResolvers.Query.crmAppBuildSettings({}, {}, member)).toThrow('Access Denied');
    expect(() => appBuildResolvers.Mutation.updateCrmAppBuildSettings({}, { input: {} }, member)).toThrow('Access Denied');
  });
});

describe('Tech → App Builds → Duncit CRM', () => {
  const configureGithub = () => {
    mockEnv.GITHUB_TOKEN = 'gh';
    mockEnv.GITHUB_OWNER = 'acme';
    mockEnv.GITHUB_REPO = 'app';
    mockEnv.SERVER_URL = 'https://api.example.test/';
  };

  it('dispatches the CRM workflow with only the inputs it declares, and queues a CRM row', async () => {
    configureGithub();
    const result = await appBuildService.trigger(
      { platform: 'ANDROID', app: 'CRM', app_env: 'STAGING', artifacts: ['AAB'], submit_to_play_store: true },
      tech
    );
    const [, workflow, ref, inputs] = dispatch.mock.calls[0];
    expect(workflow).toBe('crm-android-build.yml');
    expect(ref).toBe('staging');
    expect(Object.keys(inputs).sort()).toEqual(['app_env', 'dispatch_id', 'report_url']);
    expect(result.build).toMatchObject({ app: 'CRM', status: 'QUEUED', requested_artifacts: ['APK'], submit_to_play_store: false });
  });

  it('refuses an iOS CRM build', async () => {
    configureGithub();
    await expect(appBuildService.trigger({ platform: 'IOS', app: 'CRM', app_env: 'PRODUCTION', artifacts: ['IPA'] }, tech)).rejects.toThrow('Android only');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shows and saves the CRM channels on the Tech settings page', async () => {
    const entry = await slackEntry();
    mockEnv.SLACK_CRM_ANDROID_STAGING_BUILDS_CHANNEL = 'C-QA';
    await appBuildService.updateSettings({ crm_channel: 'C-CRM' });
    const stored = await EnvEntryModel.findById(entry._id).lean<{ config: Record<string, string> }>();
    expect(stored?.config.crm_android_builds_channel).toBe('C-CRM');
    const settings = await appBuildService.settings();
    expect(settings.crm_staging_channel).toBe('C-QA');
  });
});
