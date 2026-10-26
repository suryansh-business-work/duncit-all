/**
 * appBuildService: the staging side of a report, the report shapes that leave
 * things out, and the settings surface for the staging channels — against a
 * real database. Slack, runtime env, the artifact store and the store pushes
 * are mocked; what is asserted is the row left behind and the exact post.
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
jest.mock('@modules/platform/appBuild/playRelease.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/playRelease.service'),
  playStoreSettings: jest.fn().mockResolvedValue({ configured: false, packageName: '' }),
  pushBuildToPlayStore: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/iosSigning.service', () => ({
  ...jest.requireActual('@modules/platform/appBuild/iosSigning.service'),
  appStoreSettings: jest.fn().mockResolvedValue({ configured: false, bundleId: '', signing: null }),
}));

import { appBuildService } from '../../appBuild.service';
import { AppBuildModel } from '../../appBuild.model';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { pushBuildToPlayStore } from '@modules/platform/appBuild/playRelease.service';

const post = postMessage as jest.Mock;
const RUN_URL = 'https://github.com/acme/app/actions/runs/88';

const base = (over: Record<string, any> = {}) => ({
  platform: 'ANDROID',
  version: '2.0.0',
  workflow_run_id: '88',
  workflow_run_url: RUN_URL,
  branch: 'main',
  commit_sha: 'abcdef1234567',
  ...over,
});
const blocksText = () => JSON.stringify(post.mock.calls.at(-1)?.[0]?.blocks ?? []);

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  mockEnv.SLACK_ANDROID_BUILDS_CHANNEL = 'C-PROD';
  post.mockImplementation(async ({ channel }: { channel: string }) => ({ channel, ts: '1.2' }));
});

describe('staging reports', () => {
  it('derives STAGING for a new row built from the staging branch and announces it as staging in the production channel when no staging channel is chosen', async () => {
    const row = await appBuildService.report(base({ branch: 'staging' }), 'ci');
    expect(row.app_env).toBe('STAGING');
    expect(post.mock.calls[0][0].channel).toBe('C-PROD');
    expect(post.mock.calls[0][0].text).toBe('New Staging Android build v2.0.0 (' + row.build_no + ')');
    expect(blocksText()).toContain('*Environment:* Staging');
  });

  it('announces a staging build in the staging channel once one is chosen', async () => {
    mockEnv.SLACK_ANDROID_STAGING_BUILDS_CHANNEL = ' C-STAGING ';
    await appBuildService.report(base({ app_env: 'staging' }), 'ci');
    expect(post.mock.calls[0][0].channel).toBe('C-STAGING');
  });

  it('keeps production builds in the production channel even when a staging channel exists', async () => {
    mockEnv.SLACK_ANDROID_STAGING_BUILDS_CHANNEL = 'C-STAGING';
    const row = await appBuildService.report(base({ app_env: 'PRODUCTION' }), 'ci');
    expect(row.app_env).toBe('PRODUCTION');
    expect(post.mock.calls[0][0].channel).toBe('C-PROD');
  });

  it('lets an existing row keep what dispatch recorded when a later report says nothing about the environment', async () => {
    await appBuildService.report(base({ status: 'RUNNING', app_env: 'STAGING' }), 'ci');
    const finished = await appBuildService.report(base({ status: 'SUCCESS', branch: 'main' }), 'ci');
    expect(finished.app_env).toBe('STAGING');
    expect(await AppBuildModel.countDocuments()).toBe(1);
  });

  it('does not call a build from another branch staging', async () => {
    const row = await appBuildService.report(base({ branch: 'feature/x' }), 'ci');
    expect(row.app_env).toBe('PRODUCTION');
  });

  it('lists only one environment when the table is filtered by it', async () => {
    await appBuildService.report(base({ workflow_run_id: '1', app_env: 'STAGING' }), 'ci');
    await appBuildService.report(base({ workflow_run_id: '2', app_env: 'PRODUCTION' }), 'ci');
    const staging = await appBuildService.table('ANDROID', null, 'STAGING');
    expect(staging.rows.map((r) => r.app_env)).toEqual(['STAGING']);
    const all = await appBuildService.table('ANDROID');
    expect(all.total).toBe(2);
  });
});

describe('what a report may leave out', () => {
  it('lists no commit link when the run url is empty, and the zero-defaults of a change count with no insertions or deletions', async () => {
    await appBuildService.report(base({ workflow_run_url: '', commits: [], files_changed: 3 }), 'ci');
    const text = blocksText();
    expect(text).toContain('*Commit:* abcdef1');
    expect(text).not.toContain('/commit/');
    expect(text).toContain('*Changes:* 3 files (+0 / -0)');
  });

  it('links the commit through the run url when there is one', async () => {
    await appBuildService.report(base(), 'ci');
    expect(blocksText()).toContain('<https://github.com/acme/app/commit/abcdef1234567|abcdef1>');
  });

  it('shows a dash for a build with no branch', async () => {
    await appBuildService.report(base({ branch: '' }), 'ci');
    expect(blocksText()).toContain('*Branch:* —');
  });

  it('says why a file was not stored, with and without the reason', async () => {
    await appBuildService.report(
      base({ artifacts: [{ kind: 'APK', name: 'a.apk', size_mb: 12.34, error: 'upload timed out' }, { kind: 'AAB', name: 'a.aab' }] }),
      'ci'
    );
    const text = blocksText();
    expect(text).toContain('The build succeeded but this was not stored');
    expect(text).toContain('APK: upload timed out · AAB');
    expect(text).toContain('*Size:* APK 12.3 MB');
  });

  it('treats an empty artifact list as the primary file being absent', async () => {
    const row = await appBuildService.report(base({ artifacts: [] }), 'ci');
    expect(row.artifacts).toEqual([]);
    expect(row).toMatchObject({ build_name: '', artifact_url: '', artifact_file_id: '', artifact_error: '', size_mb: null });
  });

  it('reads no artifact from a blank build_name', async () => {
    const row = await appBuildService.report(base({ build_name: '   ', artifact_url: 'https://x/a.apk' }), 'ci');
    expect(row.artifacts).toEqual([]);
  });

  it('takes a null commit list as no commits', async () => {
    const row = await appBuildService.report(base({ commits: null }), 'ci');
    expect(row.commits).toEqual([]);
    expect(blocksText()).not.toContain('• ');
  });

  it('shows the platform and environment on a legacy row that only has the singular artifact columns', async () => {
    await AppBuildModel.collection.insertOne({
      build_no: 'DUN-BLD-LEGACY', platform: 'ANDROID', status: 'SUCCESS', version: '0.9.0', build_name: 'old.apk',
      artifact_url: 'https://x/old.apk', artifact_file_id: 'f1', size_mb: 5, created_at: new Date(), updated_at: new Date(),
    });
    const { rows } = await appBuildService.table('ANDROID');
    expect(rows[0].artifacts).toEqual([{ kind: 'APK', name: 'old.apk', url: 'https://x/old.apk', file_id: 'f1', size_mb: 5, error: '' }]);
    expect(rows[0]).toMatchObject({ app_env: 'PRODUCTION', trigger_source: 'PUSH', commits: [], play_releases: [], app_store_releases: [], stages: [] });
  });
});

describe('store push history on a row', () => {
  it('shows every Play and App Store push, finished or still running', async () => {
    const started = new Date('2026-02-01T10:00:00Z');
    const finished = new Date('2026-02-01T10:05:00Z');
    await AppBuildModel.create({
      build_no: 'DUN-BLD-7', platform: 'ANDROID', status: 'SUCCESS', version: '2.0.0',
      play_releases: [
        { track: 'INTERNAL', status: 'RELEASED', version_code: '77', by: 'ops', log: ['signed in'], started_at: started, finished_at: finished },
        { track: 'PRODUCTION', status: 'PUSHING', started_at: started },
      ],
      app_store_releases: [
        { track: 'TESTFLIGHT', status: 'RELEASED', step: 'DONE', stage: 'Done', asc_build_id: 'b1', version_id: 'v1', by: 'ops', started_at: started, heartbeat_at: finished, finished_at: finished },
        { track: 'APP_STORE', status: 'PUSHING', started_at: started, heartbeat_at: started },
      ],
    });
    const { rows } = await appBuildService.table('ANDROID');
    expect(rows[0].play_releases).toEqual([
      { track: 'INTERNAL', status: 'RELEASED', version_code: '77', error: '', by: 'ops', log: ['signed in'], started_at: started.toISOString(), finished_at: finished.toISOString() },
      { track: 'PRODUCTION', status: 'PUSHING', version_code: '', error: '', by: '', log: [], started_at: started.toISOString(), finished_at: null },
    ]);
    expect(rows[0].app_store_releases[0]).toMatchObject({ track: 'TESTFLIGHT', step: 'DONE', stage: 'Done', asc_build_id: 'b1', version_id: 'v1', by: 'ops', finished_at: finished.toISOString() });
    expect(rows[0].app_store_releases[1]).toMatchObject({ track: 'APP_STORE', step: 'UPLOAD', stage: '', asc_build_id: '', finished_at: null });
  });
});

describe('store pushes', () => {
  it('records the caller by email, or by id when there is no email', async () => {
    const doc = await AppBuildModel.create({ build_no: 'DUN-BLD-9', platform: 'ANDROID', status: 'SUCCESS', version: '1' });
    (pushBuildToPlayStore as jest.Mock).mockResolvedValue(doc);
    await appBuildService.pushToPlayStore(doc.id, 'INTERNAL', { id: 'u1', email: 'ops@example.com' } as never);
    expect(pushBuildToPlayStore).toHaveBeenLastCalledWith(doc.id, 'INTERNAL', 'ops@example.com');
    await appBuildService.pushToPlayStore(doc.id, 'INTERNAL', { id: 'u1' } as never);
    expect(pushBuildToPlayStore).toHaveBeenLastCalledWith(doc.id, 'INTERNAL', 'u1');
  });
});

describe('settings: the staging channels', () => {
  it('writes the staging channels, trimmed, onto the default Slack entry and leaves the others alone', async () => {
    const entry = await EnvEntryModel.create({
      name: 'Slack', category: 'SLACK', is_default: true, is_active: true,
      config: { android_builds_channel: 'C-A', ios_builds_channel: 'C-I' },
    });
    await appBuildService.updateSettings({ android_staging_channel: ' C-AS ', ios_staging_channel: 'C-IS' });
    const stored = await EnvEntryModel.findById(entry._id).lean<any>();
    expect(stored.config).toMatchObject({
      android_builds_channel: 'C-A', ios_builds_channel: 'C-I', android_staging_builds_channel: 'C-AS', ios_staging_builds_channel: 'C-IS',
    });
  });

  it('leaves the entry untouched when no channel is given', async () => {
    const entry = await EnvEntryModel.create({ name: 'Slack', category: 'SLACK', is_default: true, is_active: true, config: { android_builds_channel: 'C-A' } });
    await appBuildService.updateSettings({});
    expect((await EnvEntryModel.findById(entry._id).lean<any>()).config).toEqual({ android_builds_channel: 'C-A' });
  });
});
