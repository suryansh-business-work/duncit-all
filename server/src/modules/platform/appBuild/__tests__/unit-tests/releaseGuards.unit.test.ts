import fs from 'node:fs';
import { announceRelease, badInput, releasableBuild, storedArtifactPath } from '../../releaseGuards';
import { AppBuildModel } from '../../appBuild.model';
import { artifactPath } from '@modules/platform/upload/buildArtifactStore';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { logs } from '@observability/log';

jest.mock('../../appBuild.model', () => ({ AppBuildModel: { findById: jest.fn() } }));
jest.mock('@modules/platform/upload/buildArtifactStore', () => ({ artifactPath: jest.fn() }));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/platform/slack/slack.gateway', () => ({ postMessage: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

const build = (over: Record<string, unknown> = {}) => ({ platform: 'ANDROID', status: 'SUCCESS', app_env: 'PRODUCTION', ...over });
const found = (doc: unknown) => (AppBuildModel.findById as jest.Mock).mockResolvedValue(doc);

describe('badInput', () => {
  it('is a BAD_USER_INPUT graphql error', () => {
    expect(badInput('nope')).toMatchObject({ message: 'nope', extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('storedArtifactPath', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the path of the stored artifact of that kind', async () => {
    (artifactPath as jest.Mock).mockReturnValue('/store/f1');
    jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
    const doc = { artifacts: [{ kind: 'APK', file_id: 'f0' }, { kind: 'AAB', file_id: '' }, { kind: 'AAB', file_id: 'f1' }] };
    await expect(storedArtifactPath(doc as never, 'AAB', 'Google Play')).resolves.toBe('/store/f1');
    expect(artifactPath).toHaveBeenCalledWith('f1');
  });

  it.each([
    ['has no artifacts field', {}],
    ['has none of that kind', { artifacts: [{ kind: 'APK', file_id: 'x' }] }],
    ['has the kind but no stored file', { artifacts: [{ kind: 'AAB', file_id: '' }] }],
  ])('refuses a build that %s', async (_label, doc) => {
    await expect(storedArtifactPath(doc as never, 'AAB', 'Google Play')).rejects.toMatchObject({
      message: 'Only a build with a stored AAB can go to Google Play — this one has none.',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('refuses an artifact whose file name is unusable', async () => {
    (artifactPath as jest.Mock).mockReturnValue(null);
    await expect(storedArtifactPath({ artifacts: [{ kind: 'IPA', file_id: '../x' }] } as never, 'IPA', 'the App Store')).rejects.toMatchObject({
      message: 'This build’s IPA has an unusable file name and cannot be read back.',
    });
  });

  it('refuses an artifact that is gone from the build store', async () => {
    (artifactPath as jest.Mock).mockReturnValue('/store/f1');
    jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('ENOENT'));
    await expect(storedArtifactPath({ artifacts: [{ kind: 'IPA', file_id: 'f1' }] } as never, 'IPA', 'the App Store')).rejects.toMatchObject({
      message: 'This build’s IPA is no longer in the build store.',
    });
  });
});

describe('releasableBuild', () => {
  it('returns a finished, successful production build of the right platform', async () => {
    const doc = build();
    found(doc);
    await expect(releasableBuild('b1', 'ANDROID', 'Google Play')).resolves.toBe(doc);
    expect(AppBuildModel.findById).toHaveBeenCalledWith('b1');
  });

  it.each([
    ['is missing', null, 'ANDROID', 'That build no longer exists'],
    ['is for the other platform (Android wanted)', build({ platform: 'IOS' }), 'ANDROID', 'Only Android builds can go to Store.'],
    ['is for the other platform (iOS wanted)', build({ platform: 'ANDROID' }), 'IOS', 'Only iOS builds can go to Store.'],
    ['has not succeeded', build({ status: 'RUNNING' }), 'ANDROID', 'Only a finished, successful build can go to Store.'],
    ['points at staging', build({ app_env: 'STAGING' }), 'ANDROID', 'Only a production build can go to Store — this one talks to staging.'],
  ])('refuses a build that %s', async (_label, doc, platform, message) => {
    found(doc);
    await expect(releasableBuild('b1', platform as never, 'Store')).rejects.toMatchObject({ message, extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('announceRelease', () => {
  it('posts the escaped text to the configured channel', async () => {
    (getRuntimeEnvValue as jest.Mock).mockResolvedValue('  C123  ');
    await announceRelease('SLACK_ANDROID_BUILDS_CHANNEL', 'Build <b> & more', '42');
    expect(getRuntimeEnvValue).toHaveBeenCalledWith('SLACK_ANDROID_BUILDS_CHANNEL');
    expect(postMessage).toHaveBeenCalledWith({ channel: 'C123', text: 'Build &lt;b&gt; &amp; more' });
  });

  it('posts nothing when no channel is configured', async () => {
    (getRuntimeEnvValue as jest.Mock).mockResolvedValue('   ');
    await announceRelease('K', 'text', '42');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('logs a Slack failure with the build number and carries on', async () => {
    (getRuntimeEnvValue as jest.Mock).mockResolvedValue('C1');
    (postMessage as jest.Mock).mockRejectedValue(new Error('slack down'));
    await expect(announceRelease('K', 'text', '42')).resolves.toBeUndefined();
    expect(logs.server.error).toHaveBeenCalledWith('appBuild', 'releaseAnnounce', { error: expect.any(Error), build_no: '42' });
  });
});
