/**
 * appBuildService.report / table / remove against a real database.
 *
 * A workflow reports many times per build and every report must land on ONE
 * row; the finished build announces itself once on Slack. Slack, runtime env
 * and the artifact store are mocked — what is asserted is the row the reports
 * leave behind and the exact message that would be posted.
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
jest.mock('@modules/platform/upload/buildArtifactStore', () => ({
  ...jest.requireActual('@modules/platform/upload/buildArtifactStore'),
  deleteArtifact: jest.fn().mockResolvedValue(undefined),
}));

import { appBuildService, artifactKindOf } from '../../appBuild.service';
import { AppBuildModel } from '../../appBuild.model';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { deleteArtifact } from '@modules/platform/upload/buildArtifactStore';
import { logs } from '@observability/log';

const post = postMessage as jest.Mock;
const removeFile = deleteArtifact as jest.Mock;
const RUN_URL = 'https://github.com/acme/app/actions/runs/77';

const base = (over: Record<string, any> = {}) => ({
  platform: 'ANDROID',
  version: '1.4.0',
  workflow_run_id: '77',
  workflow_run_url: RUN_URL,
  branch: 'main',
  commit_sha: 'abcdef1234567',
  ...over,
});

/** The text of every block in the last Slack post, flattened for matching. */
const postedText = () => JSON.stringify(post.mock.calls.at(-1)?.[0]?.blocks ?? []);

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  mockEnv.SLACK_ANDROID_BUILDS_CHANNEL = ' C-ANDROID ';
  post.mockResolvedValue({ channel: 'C-ANDROID', ts: '111.222' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('artifactKindOf', () => {
  it('reads the kind off the file name, defaulting to APK', () => {
    expect(artifactKindOf('Duncit-1.4.0.AAB')).toBe('AAB');
    expect(artifactKindOf('duncit.ipa')).toBe('IPA');
    expect(artifactKindOf('duncit-release.apk')).toBe('APK');
    expect(artifactKindOf('mystery')).toBe('APK');
  });
});

describe('report', () => {
  it('refuses a report with no version', async () => {
    await expect(appBuildService.report(base({ version: '  ' }), 'ci')).rejects.toMatchObject({
      message: 'version is required',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await AppBuildModel.countDocuments()).toBe(0);
  });

  it('records a RUNNING report quietly, then turns the same row into the announced result', async () => {
    const running = await appBuildService.report(
      base({
        status: 'RUNNING',
        stage: 'Compiling',
        build_number: '42',
        triggered_by: 'octocat',
        commits: [
          { hash: 'h1', subject: 'feat: <!channel> & more' },
          { hash: '', subject: 'dropped: no hash' },
        ],
        files_changed: 3,
        insertions: 10,
        deletions: 2,
      }),
      'ci-bot',
    );
    expect(running.build_no).toMatch(/^DUN-BLD-\d{6}$/);
    expect(running).toMatchObject({ status: 'RUNNING', stage: 'Compiling', build_number: '42', triggered_by: 'octocat' });
    expect(running.commits).toEqual([{ hash: 'h1', subject: 'feat: <!channel> & more', author: '' }]);
    expect(post).not.toHaveBeenCalled();

    // A repeat of the same stage adds nothing to the timeline.
    await appBuildService.report(base({ status: 'RUNNING', stage: 'Compiling' }), 'ci-bot');

    const done = await appBuildService.report(
      base({
        status: 'SUCCESS',
        stage: 'Finished',
        artifacts: [
          { kind: 'APK', name: 'app.apk', url: 'https://files.example.test/app.apk', file_id: 'f-apk', size_mb: 50 },
          { kind: 'AAB', name: 'app.aab', url: '', file_id: '', size_mb: null, error: 'upload timed out' },
          { kind: 'APK', name: '   ' },
        ],
        error_message: 'ignored on success',
      }),
      'ci-bot',
    );

    expect(await AppBuildModel.countDocuments()).toBe(1);
    expect(done.id).toBe(running.id);
    expect(done).toMatchObject({
      status: 'SUCCESS',
      stage: '',
      build_number: '42',
      triggered_by: 'octocat',
      build_name: 'app.apk',
      artifact_url: 'https://files.example.test/app.apk',
      size_mb: 50,
      error_message: '',
      files_changed: 3,
      slack_channel: 'C-ANDROID',
      slack_ts: '111.222',
      slack_error: null,
    });
    expect(done.stages.map((s) => s.name)).toEqual(['Compiling', 'Finished']);
    expect(done.artifacts.map((a) => a.kind)).toEqual(['APK', 'AAB']);
    // The changelog from the start report survives the reports that did not carry one.
    expect(done.commits).toHaveLength(1);

    expect(post).toHaveBeenCalledTimes(1);
    const sent = post.mock.calls[0][0];
    expect(sent.channel).toBe('C-ANDROID');
    expect(sent.text).toBe(`New Android build v1.4.0 (${done.build_no})`);
    const text = postedText();
    expect(text).toContain('*Size:* APK 50.0 MB');
    expect(text).toContain('<https://github.com/acme/app/commit/abcdef1234567|abcdef1>');
    expect(text).toContain('*Changes:* 3 files (+10 / -2)');
    expect(text).toContain('feat: &lt;!channel&gt; &amp; more');
    expect(text).toContain('The build succeeded but this was not stored — AAB: upload timed out');
    expect(text).toContain('Download APK');
    expect(text).not.toContain('Download AAB');
    expect(text).toContain('View run');
  });

  it('announces a failure with its reason and treats an unknown status as SUCCESS', async () => {
    const failed = await appBuildService.report(
      base({ status: 'FAILED', error_message: 'Gradle exploded', workflow_run_url: '', commit_sha: '' }),
      'ci',
    );
    expect(failed).toMatchObject({ status: 'FAILED', error_message: 'Gradle exploded' });
    expect(post.mock.calls[0][0].text).toBe(`Android build failed — v1.4.0 (${failed.build_no})`);
    const text = postedText();
    expect(text).toContain(':rotating_light: Gradle exploded');
    expect(text).toContain('*Branch:* main');
    expect(text).not.toContain('*Commit:*');
    expect(text).not.toContain('View run');

    const odd = await appBuildService.report(base({ status: 'WEIRD', workflow_run_id: '78' }), 'ci');
    expect(odd.status).toBe('SUCCESS');
  });

  it('a failure with no reason posts no reason line; a plain success with nothing stored posts no warning', async () => {
    await appBuildService.report(base({ status: 'FAILED', workflow_run_id: '90' }), 'ci');
    expect(postedText()).not.toContain('rotating_light');
    await appBuildService.report(base({ status: 'SUCCESS', workflow_run_id: '91' }), 'ci');
    expect(postedText()).not.toContain('was not stored');
  });

  it('lands a legacy single-file report as a one-artifact list', async () => {
    const res = await appBuildService.report(
      base({ build_name: 'release.aab', artifact_url: 'https://files.example.test/release.aab', artifact_file_id: 'f1', size_mb: '12.25' }),
      'ci',
    );
    expect(res.artifacts).toEqual([
      { kind: 'AAB', name: 'release.aab', url: 'https://files.example.test/release.aab', file_id: 'f1', size_mb: 12.25, error: '' },
    ]);
    expect(postedText()).toContain('AAB 12.3 MB');
  });

  it('lists only the first eight commits and says how many more there were', async () => {
    const commits = Array.from({ length: 10 }, (_, i) => ({ hash: `h${i}`, subject: `change ${i}` }));
    await appBuildService.report(base({ commits }), 'ci');
    const text = postedText();
    expect(text).toContain('change 7');
    expect(text).not.toContain('change 8');
    expect(text).toContain('… and 2 more');
  });

  it('records a skipped announcement when the platform has no channel', async () => {
    const res = await appBuildService.report(base({ platform: 'IOS' }), 'ci');
    expect(res.slack_error).toBe('No Slack channel is configured for iOS builds');
    expect(res.slack_ts).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps the build when Slack refuses the post, recording why', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    post.mockRejectedValueOnce(new Error('channel_not_found'));
    const res = await appBuildService.report(base(), 'ci');
    expect(res.slack_error).toBe('channel_not_found');
    expect((await AppBuildModel.findById(res.id).lean<any>()).slack_error).toBe('channel_not_found');
    expect(logError).toHaveBeenCalledWith('appBuild', 'announce', expect.objectContaining({ build_no: res.build_no }));
  });

  it('records a non-Error Slack failure as its string form', async () => {
    jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    post.mockRejectedValueOnce('rate_limited');
    const res = await appBuildService.report(base(), 'ci');
    expect(res.slack_error).toBe('rate_limited');
  });

  it('still answers when persisting the Slack outcome fails', async () => {
    await appBuildService.report(base({ status: 'RUNNING' }), 'ci');
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const realSave = AppBuildModel.prototype.save;
    jest
      .spyOn(AppBuildModel.prototype, 'save')
      .mockImplementationOnce(function (this: any, ...args: any[]) {
        return realSave.apply(this, args as any);
      })
      .mockRejectedValueOnce(new Error('write conflict'));

    const res = await appBuildService.report(base({ status: 'SUCCESS' }), 'ci');

    expect(res.slack_ts).toBe('111.222');
    expect((await AppBuildModel.findById(res.id).lean<any>()).slack_ts).toBeNull();
    expect(logError).toHaveBeenCalledWith('appBuild', 'saveOutcome', expect.objectContaining({ build_no: res.build_no }));
  });

  it('opens a new row for every report without a run id', async () => {
    await appBuildService.report(base({ workflow_run_id: '' }), 'ci');
    await appBuildService.report(base({ workflow_run_id: '' }), 'ci');
    expect(await AppBuildModel.countDocuments()).toBe(2);
  });

  it('lets a run claim the portal row by dispatch id, keeping who triggered it', async () => {
    const queued = await AppBuildModel.create({
      build_no: 'DUN-BLD-900001',
      platform: 'ANDROID',
      status: 'QUEUED',
      dispatch_id: 'disp-1',
      trigger_source: 'PORTAL',
      triggered_by: 'ops@example.com',
      artifacts: [{ kind: 'APK', name: 'old.apk', url: 'https://files.example.test/old.apk' }],
    });
    const res = await appBuildService.report(
      base({ status: 'RUNNING', dispatch_id: 'disp-1', triggered_by: 'github-actor', stage: 'Setup' }),
      'ci',
    );
    expect(res.id).toBe(queued.id);
    expect(res.triggered_by).toBe('ops@example.com');
    expect(res.trigger_source).toBe('PORTAL');
    // A progress report that carries no artifacts leaves the stored ones alone.
    expect(res.artifacts.map((a) => a.name)).toEqual(['old.apk']);
    expect(await AppBuildModel.countDocuments()).toBe(1);
  });

  it('falls back to the run id when the dispatch id matches nothing', async () => {
    const first = await appBuildService.report(base({ status: 'RUNNING' }), 'ci');
    const second = await appBuildService.report(base({ status: 'RUNNING', dispatch_id: 'unknown' }), 'ci');
    expect(second.id).toBe(first.id);
  });
});

describe('table and remove', () => {
  it('table lists one platform and filters on whether a Slack post exists', async () => {
    await appBuildService.report(base({ workflow_run_id: '1' }), 'ci');
    await appBuildService.report(base({ platform: 'IOS', workflow_run_id: '2' }), 'ci');
    post.mockResolvedValueOnce({ channel: 'C-ANDROID', ts: null });
    await appBuildService.report(base({ workflow_run_id: '3' }), 'ci');

    const all = await appBuildService.table('ANDROID', { page: 1, page_size: 20 });
    expect(all.total).toBe(2);
    expect(all.rows.every((r) => r.platform === 'ANDROID')).toBe(true);

    const posted = await appBuildService.table('ANDROID', { filters: [{ field: 'slack_ts', op: 'is_true' } as any] });
    expect(posted.rows.map((r) => r.workflow_run_id)).toEqual(['1']);
    const unposted = await appBuildService.table('ANDROID', { filters: [{ field: 'slack_ts', op: 'is_false' } as any] });
    expect(unposted.rows.map((r) => r.workflow_run_id)).toEqual(['3']);
  });

  it('remove refuses a build that does not exist', async () => {
    await expect(appBuildService.remove('64b000000000000000000000')).rejects.toThrow('That build no longer exists');
  });

  it('remove deletes every stored artifact and the row', async () => {
    const res = await appBuildService.report(
      base({
        artifacts: [
          { kind: 'APK', name: 'a.apk', file_id: 'f-apk', url: 'u1' },
          { kind: 'AAB', name: 'a.aab', file_id: '', error: 'not stored' },
        ],
      }),
      'ci',
    );
    expect(await appBuildService.remove(res.id)).toBe(true);
    expect(removeFile.mock.calls).toEqual([['f-apk']]);
    expect(await AppBuildModel.countDocuments()).toBe(0);
  });

  it('remove reads the file of a legacy single-artifact row', async () => {
    const legacy = await AppBuildModel.create({
      build_no: 'DUN-BLD-900002',
      platform: 'IOS',
      build_name: 'old.ipa',
      artifact_file_id: 'f-ipa',
    });
    await appBuildService.remove(legacy.id);
    expect(removeFile).toHaveBeenCalledWith('f-ipa');
  });

  it('remove handles a row with no files at all', async () => {
    const empty = await AppBuildModel.create({ build_no: 'DUN-BLD-900003', platform: 'IOS' });
    await appBuildService.remove(empty.id);
    expect(removeFile).not.toHaveBeenCalled();
    expect(await AppBuildModel.countDocuments()).toBe(0);
  });
});
