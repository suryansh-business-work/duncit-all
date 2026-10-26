import { playStoreSettings, pushBuildToPlayStore, requirePlayConfig } from '../../playRelease.service';
import { AppBuildModel } from '../../appBuild.model';
import { releaseBundle } from '../../googlePlay.gateway';
import { applyPlayListing, playListingOf } from '../../googlePlayListing';
import { getStoreListing, requirePlayListing } from '../../storeListing.service';
import { announceRelease, releasableBuild, storedArtifactPath } from '../../releaseGuards';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { parseServiceAccount } from '@utils/googleServiceAccount';
import { logs } from '@observability/log';

jest.mock('../../appBuild.model', () => ({ AppBuildModel: { updateOne: jest.fn() } }));
jest.mock('../../googlePlay.gateway', () => ({ releaseBundle: jest.fn() }));
jest.mock('../../googlePlayListing', () => ({ applyPlayListing: jest.fn(), playListingOf: jest.fn() }));
jest.mock('../../storeListing.service', () => ({ getStoreListing: jest.fn(), requirePlayListing: jest.fn((doc) => doc) }));
jest.mock('../../releaseGuards', () => ({
  announceRelease: jest.fn(),
  badInput: (msg: string) => Object.assign(new Error(msg), { extensions: { code: 'BAD_USER_INPUT' } }),
  releasableBuild: jest.fn(),
  storedArtifactPath: jest.fn(),
}));
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@utils/googleServiceAccount', () => ({ parseServiceAccount: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));

const env = (json: string, pkg: string) =>
  (getRuntimeEnvValue as jest.Mock).mockImplementation(async (key: string) => (key === 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON' ? json : pkg));
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('playStoreSettings', () => {
  it('reports the package name when both the key and the package are set', async () => {
    env('{"k":1}', '  com.duncit.app  ');
    await expect(playStoreSettings()).resolves.toEqual({ configured: true, packageName: 'com.duncit.app' });
  });

  it.each([['', 'com.x'], ['  ', 'com.x'], ['{"k":1}', ''], ['{"k":1}', '   ']])('is not configured with key %p and package %p', async (json, pkg) => {
    env(json, pkg);
    await expect(playStoreSettings()).resolves.toEqual({ configured: false, packageName: '' });
  });
});

describe('requirePlayConfig', () => {
  it('returns the parsed account and the trimmed package name', async () => {
    env('{"client_email":"sa"}', ' com.x ');
    (parseServiceAccount as jest.Mock).mockReturnValue({ client_email: 'sa' });
    await expect(requirePlayConfig()).resolves.toEqual({ account: { client_email: 'sa' }, packageName: 'com.x' });
  });

  it.each([['', 'com.x'], ['{"a":1}', ' ']])('names where to configure Google Play when key %p / package %p is missing', async (json, pkg) => {
    env(json, pkg);
    await expect(requirePlayConfig()).rejects.toMatchObject({ message: expect.stringContaining('Environment Variables → Google Play') });
  });

  it('turns an unparseable key into a bad-input error, for an Error or a plain throw', async () => {
    env('{"a":1}', 'com.x');
    (parseServiceAccount as jest.Mock).mockImplementationOnce(() => {
      throw new Error('The key is not valid JSON');
    });
    await expect(requirePlayConfig()).rejects.toMatchObject({ message: 'The key is not valid JSON', extensions: { code: 'BAD_USER_INPUT' } });
    (parseServiceAccount as jest.Mock).mockImplementationOnce(() => {
      throw 'broken';
    });
    await expect(requirePlayConfig()).rejects.toMatchObject({ message: 'broken' });
  });
});

describe('pushBuildToPlayStore', () => {
  const buildDoc = (over: Record<string, unknown> = {}) => ({
    _id: 'b1', build_no: 'B-45', version: '1.2.0', commit_sha: 'abcdef1234567', play_releases: [] as any[], save: jest.fn().mockResolvedValue(undefined), ...over,
  });
  const arrange = (build: any, listing: unknown = { name: 'x' }) => {
    (releasableBuild as jest.Mock).mockResolvedValue(build);
    (storedArtifactPath as jest.Mock).mockResolvedValue('/store/app.aab');
    env('{"a":1}', 'com.duncit.app');
    (parseServiceAccount as jest.Mock).mockReturnValue({ client_email: 'sa' });
    (getStoreListing as jest.Mock).mockResolvedValue({});
    (playListingOf as jest.Mock).mockReturnValue(listing);
    (releaseBundle as jest.Mock).mockResolvedValue(77);
  };

  it('records PUSHING and answers at once, then writes the outcome and tells Slack', async () => {
    const build = buildDoc();
    arrange(build, { language: 'en-US', releaseNotes: 'Fixes' });
    const result = await pushBuildToPlayStore('b1', 'PRODUCTION', 'ops@duncit.com');
    expect(result).toBe(build);
    expect(releasableBuild).toHaveBeenCalledWith('b1', 'ANDROID', 'Google Play');
    expect(storedArtifactPath).toHaveBeenCalledWith(build, 'AAB', 'Google Play');
    expect(requirePlayListing).toHaveBeenCalled();
    expect(build.play_releases).toHaveLength(1);
    expect(build.play_releases[0]).toMatchObject({ track: 'PRODUCTION', status: 'PUSHING', by: 'ops@duncit.com', finished_at: null });
    expect(build.save).toHaveBeenCalledTimes(1);

    await settle();
    const [cfg, aab, track, releaseName, extras] = (releaseBundle as jest.Mock).mock.calls[0];
    expect(cfg).toEqual({ account: { client_email: 'sa' }, packageName: 'com.duncit.app' });
    expect(aab).toBe('/store/app.aab');
    expect(track).toBe('production');
    expect(releaseName).toBe('v1.2.0 (abcdef1)');
    expect(extras.releaseNotes).toEqual([{ language: 'en-US', text: 'Fixes' }]);
    await extras.applyListing('tok', 'edit1');
    expect(applyPlayListing).toHaveBeenCalledWith('tok', 'com.duncit.app', 'edit1', { language: 'en-US', releaseNotes: 'Fixes' });

    const update = (AppBuildModel.updateOne as jest.Mock).mock.calls[0];
    expect(update[0]).toEqual({ _id: 'b1' });
    expect(update[1].$set).toMatchObject({
      'play_releases.0.status': 'RELEASED', 'play_releases.0.version_code': '77', 'play_releases.0.error': '',
    });
    expect(update[1].$set['play_releases.0.finished_at']).toBeInstanceOf(Date);
    expect(announceRelease).toHaveBeenCalledWith(
      'SLACK_ANDROID_BUILDS_CHANNEL',
      ':rocket: Android v1.2.0 (B-45) is on Google Play production as version code 77 — pushed by ops@duncit.com',
      'B-45'
    );
    expect(logs.server.warn).toHaveBeenCalledWith('appBuild', 'playRelease', expect.objectContaining({ version_code: '77', error: '' }));
  });

  it('pushes internal testing without the store listing and without release notes', async () => {
    const build = buildDoc();
    arrange(build);
    await pushBuildToPlayStore('b1', 'INTERNAL', 'u');
    await settle();
    expect(requirePlayListing).not.toHaveBeenCalled();
    const [, , track, , extras] = (releaseBundle as jest.Mock).mock.calls[0];
    expect(track).toBe('internal');
    expect(extras.applyListing).toBeUndefined();
    expect(extras.releaseNotes).toBeUndefined();
    expect((announceRelease as jest.Mock).mock.calls[0][1]).toContain('Google Play internal testing');
  });

  it('sends no release note when the listing has none', async () => {
    arrange(buildDoc(), { language: 'en-US', releaseNotes: '' });
    await pushBuildToPlayStore('b1', 'PRODUCTION', 'u');
    await settle();
    expect((releaseBundle as jest.Mock).mock.calls[0][4].releaseNotes).toEqual([]);
  });

  it('records a failure with the error, a bounded step log, and says so on Slack', async () => {
    const build = buildDoc();
    arrange(build);
    (releaseBundle as jest.Mock).mockImplementation(async (_c, _p, _t, _n, extras) => {
      for (let i = 0; i < 250; i += 1) extras.onStep(`step ${i} ${'x'.repeat(400)}`);
      throw new Error('E'.repeat(700));
    });
    await pushBuildToPlayStore('b1', 'INTERNAL', 'u');
    await settle();
    const set = (AppBuildModel.updateOne as jest.Mock).mock.calls[0][1].$set;
    expect(set['play_releases.0.status']).toBe('FAILED');
    expect(set['play_releases.0.version_code']).toBe('');
    expect(set['play_releases.0.error']).toHaveLength(500);
    expect(set['play_releases.0.log']).toHaveLength(200);
    expect(set['play_releases.0.log'][0]).toMatch(/^\d{4}-\d\d-\d\dT.*step 0 /);
    expect((announceRelease as jest.Mock).mock.calls[0][1]).toMatch(/^:x: Android v1\.2\.0 \(B-45\) could not be pushed to Google Play internal testing — /);
  });

  it('writes a non-Error failure as text', async () => {
    arrange(buildDoc());
    (releaseBundle as jest.Mock).mockRejectedValue('plain failure');
    await pushBuildToPlayStore('b1', 'INTERNAL', 'u');
    await settle();
    expect((AppBuildModel.updateOne as jest.Mock).mock.calls[0][1].$set['play_releases.0.error']).toBe('plain failure');
  });

  it('indexes a new entry after the earlier ones and ignores a finished or stale push', async () => {
    const old = { status: 'RELEASED', started_at: new Date() };
    const stale = { status: 'PUSHING', started_at: new Date(Date.now() - 16 * 60_000) };
    const build = buildDoc({ play_releases: [old, stale] });
    arrange(build);
    await pushBuildToPlayStore('b1', 'INTERNAL', 'u');
    await settle();
    expect(build.play_releases).toHaveLength(3);
    expect((AppBuildModel.updateOne as jest.Mock).mock.calls[0][1].$set['play_releases.2.status']).toBe('RELEASED');
  });

  it('refuses while a push to Play is already running for the build', async () => {
    const build = buildDoc({ play_releases: [{ status: 'PUSHING', started_at: new Date() }] });
    arrange(build);
    await expect(pushBuildToPlayStore('b1', 'INTERNAL', 'u')).rejects.toMatchObject({ message: 'A push to Google Play is already in progress for B-45.' });
    expect(build.save).not.toHaveBeenCalled();
  });

  it('refuses in the request, before recording anything, when the listing is incomplete', async () => {
    const build = buildDoc();
    arrange(build);
    (requirePlayListing as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Store Listing is missing what Google Play needs: name');
    });
    await expect(pushBuildToPlayStore('b1', 'PRODUCTION', 'u')).rejects.toThrow('Store Listing is missing');
    expect(build.save).not.toHaveBeenCalled();
    expect(releaseBundle).not.toHaveBeenCalled();
  });

  it('logs a failure of the background bookkeeping itself', async () => {
    arrange(buildDoc());
    (AppBuildModel.updateOne as jest.Mock).mockRejectedValueOnce(new Error('mongo down'));
    await pushBuildToPlayStore('b1', 'INTERNAL', 'u');
    await settle();
    expect(logs.server.error).toHaveBeenCalledWith('appBuild', 'playRelease', { error: expect.any(Error), build_no: 'B-45' });
  });
});
