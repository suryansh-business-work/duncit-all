/**
 * The Duncit CRM app is built from the same repository as the member app. Its
 * builds must stay out of the member app's table, changelog base and store
 * pushes, announce on their own Slack channel, and be downloadable by CRM staff.
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

import type { GraphQLContext } from '@context';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { appBuildService } from '../../appBuild.service';
import { appBuildResolvers } from '../../appBuild.resolver';
import { AppBuildModel } from '../../appBuild.model';
import { releasableBuild } from '../../releaseGuards';

const post = postMessage as jest.Mock;
const crmStaff = { user: { id: 'crm-1', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
const member = { user: { id: 'u-1', roles: ['USER'] } } as unknown as GraphQLContext;

const report = (over: Record<string, unknown> = {}) =>
  appBuildService.report(
    {
      platform: 'ANDROID',
      version: '1.0.0',
      workflow_run_id: String(Math.random()).slice(2),
      branch: 'main',
      status: 'SUCCESS',
      artifacts: [{ kind: 'APK', name: 'duncit-crm.apk', url: 'https://server.duncit.com/app-builds/duncit-crm.apk', size_mb: 40.5 }],
      ...over,
    },
    'ci'
  );

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  mockEnv.SLACK_ANDROID_BUILDS_CHANNEL = 'C-ANDROID';
  post.mockReset();
  post.mockResolvedValue({ channel: 'C-X', ts: '1.2' });
});

describe('the app a build belongs to', () => {
  it('is CRM when the reporter says so, and the member app when it says nothing', async () => {
    const crm = await report({ app: 'CRM' });
    const legacy = await report();
    expect(crm.app).toBe('CRM');
    expect(legacy.app).toBe('DUNCIT');
  });

  it('cannot be moved to the other app by a later report of the same run', async () => {
    await report({ app: 'CRM', workflow_run_id: '900', status: 'RUNNING' });
    const finished = await report({ app: 'DUNCIT', workflow_run_id: '900' });
    expect(finished.app).toBe('CRM');
  });

  it('keeps each app to its own table; rows from before the field count as the member app', async () => {
    await report({ app: 'CRM', version: '1.0.0' });
    await report({ version: '9.9.9' });
    await AppBuildModel.collection.insertOne({
      build_no: 'DUN-BLD-LEGACY',
      platform: 'ANDROID',
      status: 'SUCCESS',
      version: '0.1.0',
      artifacts: [],
      commits: [],
      stages: [],
      play_releases: [],
      app_store_releases: [],
      created_at: new Date(),
    });

    const crm = await appBuildService.table('ANDROID', null, null, 'CRM');
    const memberApp = await appBuildService.table('ANDROID', null, null, null);

    expect(crm.rows.map((r) => r.version)).toEqual(['1.0.0']);
    expect(memberApp.rows.map((r) => r.version).sort()).toEqual(['0.1.0', '9.9.9']);
    expect(memberApp.rows.every((r) => r.app === 'DUNCIT')).toBe(true);
  });
});

describe('announcing a CRM build', () => {
  it('posts to the CRM channel under a Duncit CRM headline', async () => {
    mockEnv.SLACK_CRM_ANDROID_BUILDS_CHANNEL = 'C-CRM';
    await report({ app: 'CRM', app_env: 'STAGING', branch: 'staging' });
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ channel: 'C-CRM' }));
    expect(post.mock.calls[0][0].text).toContain('New Duncit CRM Staging Android build v1.0.0');
  });

  it('falls back to the Android builds channel until a CRM channel is chosen', async () => {
    await report({ app: 'CRM' });
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ channel: 'C-ANDROID' }));
  });

  it('leaves the member app’s announcements exactly as they were', async () => {
    mockEnv.SLACK_CRM_ANDROID_BUILDS_CHANNEL = 'C-CRM';
    await report();
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ channel: 'C-ANDROID' }));
    expect(post.mock.calls[0][0].text).toContain('New Android build v1.0.0');
  });
});

describe('crmAppDownload', () => {
  it('offers the newest successful APK of each environment', async () => {
    await report({ app: 'CRM', version: '1.0.0' });
    await report({ app: 'CRM', version: '1.0.1', build_number: '12' });
    await report({ app: 'CRM', version: '1.0.2', status: 'FAILED', artifacts: [] });
    await report({ app: 'CRM', version: '0.9.0', app_env: 'STAGING' });
    await report({ version: '5.0.0' });

    const download = await appBuildResolvers.Query.crmAppDownload({}, {}, crmStaff);

    expect(download.production).toMatchObject({
      version: '1.0.1',
      build_number: '12',
      apk_url: 'https://server.duncit.com/app-builds/duncit-crm.apk',
      size_mb: 40.5,
      app_env: 'PRODUCTION',
    });
    expect(download.staging).toMatchObject({ version: '0.9.0', app_env: 'STAGING' });
  });

  it('is null for an environment with no CRM build yet', async () => {
    await report({ version: '5.0.0' });
    expect(await appBuildService.crmDownload()).toEqual({ production: null, staging: null });
  });

  it('is CRM staff only', () => {
    expect(() => appBuildResolvers.Query.crmAppDownload({}, {}, member)).toThrow('Access Denied');
  });
});

describe('store pushes', () => {
  it('refuse a CRM build: the store listings belong to the member app', async () => {
    const crm = await report({ app: 'CRM' });
    await expect(releasableBuild(crm.id, 'ANDROID', 'Google Play')).rejects.toThrow('cannot go to Google Play');
  });
});
