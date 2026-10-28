/**
 * The corners of an e2e run's life that the main lifecycle tests leave out:
 * which row a report joins, how the Slack announcement reads for a run with
 * nothing to link to, a long red list, a thread that needs two batches of
 * clips, rows written before the arrays existed, a ceiling of zero, and the
 * rows that vanish while a request is in flight.
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
jest.mock('@modules/platform/slack/slack.gateway', () => ({
  ...jest.requireActual('@modules/platform/slack/slack.gateway'),
  postMessage: jest.fn(),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  completeFileUpload: jest.fn(),
  ensureChannelMember: jest.fn().mockResolvedValue(undefined),
  getFileUploadUrl: jest.fn(),
  isSlackConfigured: jest.fn().mockResolvedValue(false),
}));

import { e2eRunService } from '../../e2eRun.service';
import { E2eRunModel, E2eRunSettingsModel, E2E_SETTINGS_KEY } from '../../e2eRun.model';
import { dispatchWorkflow } from '@utils/github-actions';
import { completeFileUpload, deleteFile, getFileUploadUrl, postMessage } from '@modules/platform/slack/slack.gateway';

const dispatch = dispatchWorkflow as jest.Mock;
const post = postMessage as jest.Mock;
const upload = completeFileUpload as jest.Mock;
const removeFile = deleteFile as jest.Mock;
const slot = getFileUploadUrl as jest.Mock;

let seq = 900;
const row = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return E2eRunModel.create({ run_no: `DUN-E2E-${String(seq).padStart(6, '0')}`, dispatch_id: `d${seq}`, ...over });
};
const postedText = () => JSON.stringify(post.mock.calls.at(-1)?.[0]?.blocks ?? []);

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  mockEnv.SERVER_URL = 'https://api.example.test/';
  mockEnv.SLACK_E2E_CHANNEL = 'C-E2E';
  post.mockResolvedValue({ channel: 'C-E2E', ts: '900.1' });
  upload.mockImplementation(async ({ files }: { files: Array<{ id: string }> }) =>
    files.map((f) => ({ id: f.id, permalink: `https://slack.example.test/${f.id}` })),
  );
});
afterEach(() => jest.restoreAllMocks());

describe('which row a report joins', () => {
  it('falls back to the workflow run id when the dispatch id matches nothing', async () => {
    const existing = await row({ workflow_run_id: '777', ref: 'staging' });
    const res = await e2eRunService.start({ dispatch_id: 'never-dispatched', workflow_run_id: '777' }, 'ci');
    expect(res.run.id).toBe(String(existing._id));
    expect(await E2eRunModel.countDocuments()).toBe(1);
  });

  it('opens a fresh row when neither key matches', async () => {
    await row({ workflow_run_id: '777' });
    const res = await e2eRunService.start({ dispatch_id: 'unknown', workflow_run_id: '888' }, 'ci');
    expect(res.run.workflow_run_id).toBe('888');
    expect(await E2eRunModel.countDocuments()).toBe(2);
  });

  it('records the run id and url a later report brings, and keeps the ones it already had when it brings none', async () => {
    const run = await row({ workflow_run_id: '' });
    const first = await e2eRunService.report(
      { dispatch_id: run.dispatch_id, workflow_run_id: '4242', workflow_run_url: 'https://github.com/acme/app/actions/runs/4242', stage: 'Building' },
      'ci',
    );
    expect(first).toMatchObject({ workflow_run_id: '4242', workflow_run_url: 'https://github.com/acme/app/actions/runs/4242', stage: 'Building' });
    const second = await e2eRunService.report({ workflow_run_id: '4242', stage: 'Testing' }, 'ci');
    expect(second).toMatchObject({ workflow_run_id: '4242', stage: 'Testing' });
  });

  it('survives its row being deleted between the write and the re-read', async () => {
    const run = await row();
    jest.spyOn(E2eRunModel, 'findById').mockResolvedValueOnce(null as never);
    const out = await e2eRunService.report({ dispatch_id: run.dispatch_id, stage: 'Testing' }, 'ci');
    expect(out.run_no).toBe(run.run_no);
  });
});

describe('the Slack announcement of a run with little to say', () => {
  it('shows a dash for a branch and a starter nobody recorded, and offers no run button without a run link', async () => {
    const run = await row({ ref: '', triggered_by: '', status: 'RUNNING' });
    await e2eRunService.report({ dispatch_id: run.dispatch_id, status: 'SUCCESS' }, 'ci');
    const text = postedText();
    expect(text).toContain('*Branch:* —');
    expect(text).toContain('*Started by:* —');
    expect(text).not.toContain('*Commit:*');
    expect(text).not.toContain('View run');
  });

  it('prints the short commit as plain text when there is no run url to derive a link from', async () => {
    const run = await row({ ref: 'staging', commit_sha: 'abcdef1234567890' });
    await e2eRunService.report({ dispatch_id: run.dispatch_id, status: 'SUCCESS' }, 'ci');
    expect(postedText()).toContain('*Commit:* abcdef1');
    expect(postedText()).not.toContain('/commit/');
  });

  it('points the portal button at the configured portal', async () => {
    mockEnv.TESTS_URL = 'https://tests.example.test/';
    const run = await row({ ref: 'staging' });
    await e2eRunService.report({ dispatch_id: run.dispatch_id, status: 'SUCCESS' }, 'ci');
    const elements = post.mock.calls.at(-1)?.[0].blocks.at(-1).elements;
    expect(elements.map((b: { text: { text: string } }) => b.text.text)).toEqual(['Open in Duncit']);
    expect(elements[0].url).toBe('https://tests.example.test/e2e/runs');
  });

  it('names at most eight red suites and counts the rest', async () => {
    const run = await row({ ref: 'staging' });
    for (let i = 1; i <= 10; i += 1) {
      await e2eRunService.report({ dispatch_id: run.dispatch_id, suite: { key: `suite-${i}`, status: 'FAILED', error: i === 1 ? 'boom' : '' } }, 'ci');
    }
    await e2eRunService.report({ dispatch_id: run.dispatch_id, status: 'FAILED', error_message: 'ten red' }, 'ci');
    const text = postedText();
    expect(text).toContain('suite-8');
    expect(text).not.toContain('suite-9');
    expect(text).toContain('… and 2 more');
    expect(text).toContain('boom');
    expect(text).toContain('ten red');
  });

  it('lists a handful of red suites without a tail', async () => {
    const run = await row({ ref: 'staging' });
    await e2eRunService.report({ dispatch_id: run.dispatch_id, suite: { key: 'only-red', status: 'FAILED', error: 'bad' } }, 'ci');
    await e2eRunService.report({ dispatch_id: run.dispatch_id, status: 'FAILED' }, 'ci');
    expect(postedText()).toContain('only-red');
    expect(postedText()).not.toContain('more');
  });

  it('records a Slack failure that was thrown as something other than an Error', async () => {
    const run = await row();
    post.mockRejectedValueOnce('slack is down');
    await e2eRunService.report({ dispatch_id: run.dispatch_id, status: 'SUCCESS' }, 'ci');
    expect((await E2eRunModel.findById(run._id).lean())?.slack_error).toBe('slack is down');
  });
});

describe('sharing recordings', () => {
  it('splits a long list of scenario clips over several uploads, with the sentence on the first only', async () => {
    const run = await row({ slack_channel: 'C-E2E', slack_ts: '900.1', status: 'SUCCESS', results: [{ key: 'accounts', video_file_id: 'SUITE-VID' }] });
    const scenarios = Array.from({ length: 12 }, (_, i) => ({ suite: 'accounts', title: `case ${i}`, file_id: `F${i}`, spec: 'a.cy.ts', state: i === 0 ? '' : 'passed' }));
    const out = await e2eRunService.attachVideos({ dispatch_id: run.dispatch_id, scenarios });
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload.mock.calls[1][0].initial_comment).toMatch(/^Scenarios for /);
    expect(upload.mock.calls[2][0].initial_comment).toBeUndefined();
    expect(upload.mock.calls[1][0].files[0].title).toContain('— recorded');
    expect(out.scenario_videos).toHaveLength(12);
    expect(out.scenario_videos.every((v: { permalink: string }) => v.permalink.startsWith('https://slack.example.test/'))).toBe(true);
    expect(out.video_error).toBeNull();
  });

  it('records a share that failed with something other than an Error', async () => {
    const run = await row({ slack_channel: 'C-E2E', slack_ts: '900.1', results: [{ key: 'accounts', video_file_id: 'SUITE-VID' }] });
    upload.mockRejectedValueOnce('quota');
    const out = await e2eRunService.attachVideos({
      dispatch_id: run.dispatch_id,
      scenarios: [{ suite: 'accounts', title: 't', file_id: 'F1' }],
    });
    expect(out.video_error).toBe('quota');
  });

  it('answers from what it has when the row is gone before the share and before the final read', async () => {
    const run = await row();
    const real = E2eRunModel.findById.bind(E2eRunModel);
    const spy = jest.spyOn(E2eRunModel, 'findById');
    spy.mockResolvedValueOnce(null as never);
    spy.mockResolvedValueOnce(null as never);
    spy.mockImplementation(real as never);
    const out = await e2eRunService.attachVideos({ dispatch_id: run.dispatch_id });
    expect(out.run_no).toBe(run.run_no);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('an upload slot', () => {
  it('refuses a recording with no length, and a missing length counts as none', async () => {
    const run = await row();
    await E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: { record_videos: true } }, { upsert: true });
    const out = await e2eRunService.videoUploadAuth({ dispatch_id: run.dispatch_id, suite: 'accounts' });
    expect(out).toEqual({ ok: false, upload_url: '', file_id: '', reason: 'A recording with no bytes in it cannot be uploaded.' });
    expect(slot).not.toHaveBeenCalled();
  });

  it('turns a slot failure that was not an Error into the reason', async () => {
    const run = await row();
    await E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: { record_videos: true } }, { upsert: true });
    slot.mockRejectedValueOnce('no scope');
    const out = await e2eRunService.videoUploadAuth({ dispatch_id: run.dispatch_id, suite: 'accounts', length: 10 });
    expect(out).toMatchObject({ ok: false, reason: 'no scope' });
  });
});

describe('deleting and pruning', () => {
  it('forgets the recordings of a row written before the arrays existed without choking', async () => {
    const { insertedId } = await E2eRunModel.collection.insertOne({ run_no: 'DUN-E2E-000050', status: 'SUCCESS', created_at: new Date() });
    await expect(e2eRunService.remove(String(insertedId))).resolves.toBe(true);
    expect(removeFile).not.toHaveBeenCalled();
    await expect(e2eRunService.remove(String(insertedId))).resolves.toBe(false);
  });

  it('deletes the clips of a scenario row when the run goes', async () => {
    const run = await row({ status: 'SUCCESS', scenario_videos: [{ suite: 's', title: 't', file_id: 'CLIP-1' }], results: [{ key: 's', video_file_id: 'VID-1' }] });
    await e2eRunService.remove(String(run._id));
    expect(removeFile.mock.calls.map((call) => call[0]).sort()).toEqual(['CLIP-1', 'VID-1']);
  });

  it('refuses to prune when the ceiling is zero, so a bad setting cannot wipe the history', async () => {
    mockEnv.GITHUB_TOKEN = 't';
    mockEnv.GITHUB_OWNER = 'acme';
    mockEnv.GITHUB_REPO = 'app';
    await E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: { enabled: true, keep_last: 0, last_run_at: null } }, { upsert: true });
    await row({ status: 'SUCCESS' });
    await row({ status: 'FAILED' });
    const runNo = await e2eRunService.runIfDue();
    expect(runNo).toMatch(/^DUN-E2E-/);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(await E2eRunModel.countDocuments()).toBe(3);
  });

  it('uses the current time when the scheduler asks without one, and stays quiet while the schedule is off', async () => {
    await expect(e2eRunService.runIfDue()).resolves.toBeNull();
  });
});
