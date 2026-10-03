/**
 * appBuildService: starting a build from the portal, and the settings / store
 * push / CI token surfaces around it — against a real database.
 *
 * GitHub's dispatch, the store pushes and runtime env are mocked; the real
 * repo-config and URL logic run on top of the mocked env, so "not configured"
 * is the genuine answer to an empty env rather than a stub's.
 */
const mockEnv: Record<string, string> = {};
jest.mock('@config/runtimeEnv', () => ({
  ...jest.requireActual('@config/runtimeEnv'),
  getRuntimeEnvValue: jest.fn(async (key: string) => mockEnv[key] ?? ''),
}));
jest.mock('@utils/github-actions', () => ({
  ...jest.requireActual('@utils/github-actions'),
  dispatchWorkflow: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/platform/upload/uploadTicket', () => ({
  ...jest.requireActual('@modules/platform/upload/uploadTicket'),
  issueUploadTicket: jest.fn(() => 'ticket-1'),
}));
jest.mock('@modules/platform/appBuild/playRelease.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/playRelease.service'),
  playStoreSettings: jest.fn().mockResolvedValue({ configured: true, packageName: 'com.example.app' }),
  pushBuildToPlayStore: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/appStoreRelease.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/appStoreRelease.service'),
  pushBuildToAppStore: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/iosSigning.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/iosSigning.service'),
  appStoreSettings: jest.fn().mockResolvedValue({ configured: false, bundleId: '', signing: null }),
}));

import jwt from 'jsonwebtoken';

import { appBuildService, APP_BUILDS_FOLDER } from '../../appBuild.service';
import { AppBuildModel } from '../../appBuild.model';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { dispatchWorkflow } from '@utils/github-actions';
import { issueUploadTicket } from '@modules/platform/upload/uploadTicket';
import { pushBuildToPlayStore } from '@modules/platform/appBuild/playRelease.service';
import { pushBuildToAppStore } from '@modules/platform/appBuild/appStoreRelease.service';

const dispatch = dispatchWorkflow as jest.Mock;
const user = { id: '64b0000000000000000000aa', email: 'ops@example.com', roles: ['TECH_MANAGER'] } as any;

const configureGithub = () => {
  mockEnv.GITHUB_TOKEN = 'gh-test-token';
  mockEnv.GITHUB_OWNER = 'acme';
  mockEnv.GITHUB_REPO = 'app';
};

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  mockEnv.SERVER_URL = 'https://api.example.test/';
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('trigger', () => {
  it.each([
    [{ platform: 'IOS', app_env: 'PRODUCTION', artifacts: ['IPA', 'APK'] }, 'iOS cannot build APK'],
    [{ platform: 'ANDROID', app_env: 'PRODUCTION', artifacts: [] }, 'Pick at least one artifact to build'],
    [{ platform: 'ANDROID', app_env: 'PRODUCTION', artifacts: 'APK' }, 'Pick at least one artifact to build'],
    [
      { platform: 'IOS', app_env: 'PRODUCTION', artifacts: ['IPA'], submit_to_play_store: true },
      'Only Android AAB builds can be submitted to Google Play.',
    ],
    [
      { platform: 'ANDROID', app_env: 'STAGING', artifacts: ['AAB'], submit_to_play_store: true },
      'Google Play submission requires a production build.',
    ],
    [
      { platform: 'ANDROID', app_env: 'PRODUCTION', artifacts: ['APK'], submit_to_play_store: true },
      'Google Play submission requires the AAB artifact.',
    ],
  ])('refuses %j before touching GitHub', async (input, message) => {
    configureGithub();
    await expect(appBuildService.trigger(input, user)).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(await AppBuildModel.countDocuments()).toBe(0);
  });

  it('refuses when GitHub is not configured, leaving no row', async () => {
    await expect(
      appBuildService.trigger({ platform: 'ANDROID', app_env: 'PRODUCTION', artifacts: ['APK'] }, user),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_REQUEST' } });
    expect(await AppBuildModel.countDocuments()).toBe(0);
  });

  it('queues an Android build, dispatching artifacts in platform order and the Play flag', async () => {
    configureGithub();
    const res = await appBuildService.trigger(
      { platform: 'ANDROID', app_env: 'PRODUCTION', artifacts: ['AAB', 'APK', 'AAB'], submit_to_play_store: true },
      user,
    );

    expect(res.build).toMatchObject({
      platform: 'ANDROID',
      status: 'QUEUED',
      trigger_source: 'PORTAL',
      triggered_by: 'ops@example.com',
      app_env: 'PRODUCTION',
      requested_artifacts: ['APK', 'AAB'],
      submit_to_play_store: true,
      branch: 'main',
      stage: 'Waiting for a runner',
    });
    expect(res.build.stages.map((s) => s.name)).toEqual(['Queued']);
    expect(res.build.dispatch_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(dispatch).toHaveBeenCalledWith(
      { token: 'gh-test-token', owner: 'acme', repo: 'app' },
      'android-build.yml',
      'main',
      {
        app_env: 'production',
        dispatch_id: res.build.dispatch_id,
        report_url: 'https://api.example.test/graphql',
        artifacts: 'APK,AAB',
        submit_to_play_store: 'true',
      },
    );
    expect(res.actions_url).toBe(
      'https://github.com/acme/app/actions/workflows/android-build.yml?query=branch%3Amain',
    );
  });

  it('queues an iOS staging build from the staging branch with no artifacts input, named by id without an email', async () => {
    configureGithub();
    const res = await appBuildService.trigger(
      { platform: 'IOS', app_env: 'STAGING', artifacts: ['IPA'] },
      { ...user, email: null },
    );
    expect(res.build.branch).toBe('staging');
    expect(res.build.triggered_by).toBe(user.id);
    expect(res.build.submit_to_play_store).toBe(false);
    const [, workflow, ref, inputs] = dispatch.mock.calls[0];
    expect(workflow).toBe('ios-build.yml');
    expect(ref).toBe('staging');
    expect(inputs).toEqual({
      app_env: 'staging',
      dispatch_id: res.build.dispatch_id,
      report_url: 'https://api.example.test/graphql',
    });
  });

  it('builds from an explicit ref when one is given', async () => {
    configureGithub();
    const res = await appBuildService.trigger(
      { platform: 'ANDROID', app_env: 'STAGING', artifacts: ['APK'], ref: ' feature/x ' },
      user,
    );
    expect(res.build.branch).toBe('feature/x');
    expect(dispatch.mock.calls[0][2]).toBe('feature/x');
  });

  it('removes the queued row again when GitHub refuses the dispatch', async () => {
    configureGithub();
    dispatch.mockRejectedValueOnce(new Error('Workflow not found'));
    await expect(
      appBuildService.trigger({ platform: 'ANDROID', app_env: 'PRODUCTION', artifacts: ['APK'] }, user),
    ).rejects.toThrow('Workflow not found');
    expect(await AppBuildModel.countDocuments()).toBe(0);
  });
});

describe('configuration surfaces', () => {
  it('triggerConfig reports an unconfigured repo and where builds report to', async () => {
    expect(await appBuildService.triggerConfig()).toEqual({
      configured: false,
      repository: '',
      production_ref: 'main',
      staging_ref: 'staging',
      reports_to: 'https://api.example.test',
    });
  });

  it('triggerConfig names the configured repository', async () => {
    configureGithub();
    const res = await appBuildService.triggerConfig();
    expect(res.configured).toBe(true);
    expect(res.repository).toBe('acme/app');
  });

  it('uploadAuth issues a builds ticket for the caller', async () => {
    expect(await appBuildService.uploadAuth('u-1')).toEqual({
      upload_url: 'https://api.example.test/upload',
      ticket: 'ticket-1',
      folder: APP_BUILDS_FOLDER,
    });
    expect(issueUploadTicket).toHaveBeenCalledWith('u-1', '/app-builds', 'builds');
  });

  it('settings with nothing reported and no channels', async () => {
    expect(await appBuildService.settings()).toEqual({
      android_channel: null,
      ios_channel: null,
      last_reported_at: null,
      last_reported_by: null,
      play_store_configured: true,
      play_package_name: 'com.example.app',
      app_store_configured: false,
      app_store_bundle_id: '',
      ios_signing: null,
    });
  });

  it('settings shows the channels and the most recent report', async () => {
    mockEnv.SLACK_ANDROID_BUILDS_CHANNEL = ' C-AND ';
    mockEnv.SLACK_IOS_BUILDS_CHANNEL = 'C-IOS';
    await AppBuildModel.collection.insertMany([
      { build_no: 'DUN-BLD-1', platform: 'ANDROID', reported_by: 'old-ci', created_at: new Date('2026-09-01T00:00:00.000Z') },
      { build_no: 'DUN-BLD-2', platform: 'IOS', reported_by: 'new-ci', created_at: new Date('2026-10-01T00:00:00.000Z') },
    ]);
    const res = await appBuildService.settings();
    expect(res).toMatchObject({
      android_channel: 'C-AND',
      ios_channel: 'C-IOS',
      last_reported_at: '2026-10-01T00:00:00.000Z',
      last_reported_by: 'new-ci',
    });
  });

  it('updateSettings refuses until a default, active Slack entry exists', async () => {
    await EnvEntryModel.create({ name: 'Old Slack', category: 'SLACK', is_default: true, is_active: false, config: {} });
    await expect(appBuildService.updateSettings({ android_channel: 'C1' })).rejects.toThrow(/Connect Slack first/);
  });

  it('updateSettings writes only the channels it was given, trimmed', async () => {
    const entry = await EnvEntryModel.create({
      name: 'Slack',
      category: 'SLACK',
      is_default: true,
      is_active: true,
      config: { ios_builds_channel: 'C-KEEP' },
    });
    await appBuildService.updateSettings({ android_channel: ' C-NEW ' });
    let stored = await EnvEntryModel.findById(entry._id).lean<any>();
    expect(stored.config).toMatchObject({ android_builds_channel: 'C-NEW', ios_builds_channel: 'C-KEEP' });

    await appBuildService.updateSettings({ ios_channel: null });
    stored = await EnvEntryModel.findById(entry._id).lean<any>();
    expect(stored.config.ios_builds_channel).toBe('');

    // Nothing given, nothing written — and the settings still come back.
    const res = await appBuildService.updateSettings({});
    expect(res.play_package_name).toBe('com.example.app');
  });
});

describe('store pushes and the CI token', () => {
  it('pushToPlayStore / pushToAppStore pass the caller on and shape the row they return', async () => {
    const doc = await AppBuildModel.create({ build_no: 'DUN-BLD-777', platform: 'ANDROID', version: '2.0.0' });
    (pushBuildToPlayStore as jest.Mock).mockResolvedValue(doc);
    (pushBuildToAppStore as jest.Mock).mockResolvedValue(doc);

    const play = await appBuildService.pushToPlayStore(doc.id, 'INTERNAL' as any, user);
    expect(pushBuildToPlayStore).toHaveBeenCalledWith(doc.id, 'INTERNAL', 'ops@example.com');
    expect(play).toMatchObject({ id: doc.id, build_no: 'DUN-BLD-777', version: '2.0.0' });

    await appBuildService.pushToAppStore(doc.id, 'TESTFLIGHT' as any, { ...user, email: undefined });
    expect(pushBuildToAppStore).toHaveBeenCalledWith(doc.id, 'TESTFLIGHT', user.id);
  });

  it('ciToken re-signs exactly the caller identity', async () => {
    const res = await appBuildService.ciToken({ ...user, assigned_zones: ['z1'] });
    expect(res.secret_name).toBe('DUNCIT_RELEASE_TOKEN');
    expect(res.issued_for).toBe('ops@example.com');
    const claims = jwt.decode(res.token) as any;
    expect(claims).toMatchObject({
      id: user.id,
      email: 'ops@example.com',
      roles: ['TECH_MANAGER'],
      assigned_city: null,
      assigned_zones: ['z1'],
    });
  });

  it('ciToken falls back to the id when the caller has no email', async () => {
    const res = await appBuildService.ciToken({ id: user.id, roles: [] } as any);
    expect(res.issued_for).toBe(user.id);
    expect((jwt.decode(res.token) as any).email).toBeNull();
  });
});
