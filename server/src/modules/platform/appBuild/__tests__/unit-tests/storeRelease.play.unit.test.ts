import { listPlayReleases } from '../../storeRelease.play';
import { call, discardEdit, openEdit, playAccessToken } from '../../googlePlay.gateway';

jest.mock('../../googlePlay.gateway', () => ({
  API: 'https://play.api/apps',
  auth: (token: string) => ({ Authorization: `Bearer ${token}` }),
  call: jest.fn(),
  discardEdit: jest.fn(),
  openEdit: jest.fn(),
  playAccessToken: jest.fn(),
}));

const cfg = { account: { client_email: 'sa@x' } as never, packageName: 'com.duncit.app' };

beforeEach(() => {
  (playAccessToken as jest.Mock).mockResolvedValue('tok');
  (openEdit as jest.Mock).mockResolvedValue('edit1');
});

describe('listPlayReleases', () => {
  it('reads the tracks inside an edit and throws the edit away afterwards', async () => {
    (call as jest.Mock).mockResolvedValue({ tracks: [] });
    await expect(listPlayReleases(cfg)).resolves.toEqual({ packageName: 'com.duncit.app', url: 'https://play.google.com/console/', rows: [] });
    expect(playAccessToken).toHaveBeenCalledWith(cfg.account);
    expect(openEdit).toHaveBeenCalledWith('tok', 'com.duncit.app');
    expect(call).toHaveBeenCalledWith('https://play.api/apps/com.duncit.app/edits/edit1/tracks', { headers: { Authorization: 'Bearer tok' } });
    expect(discardEdit).toHaveBeenCalledWith('tok', 'com.duncit.app', 'edit1');
  });

  it('folds each release into a row, production first, with the rollout as a percentage', async () => {
    (call as jest.Mock).mockResolvedValue({
      tracks: [
        { track: 'internal', releases: [{ name: '1.2.0 (45)', versionCodes: ['45'], status: 'completed' }] },
        {
          track: 'production',
          releases: [
            { name: '1.1.0', versionCodes: [40, '41'], status: 'inProgress', userFraction: 0.256 },
            { name: '1.0.0', versionCodes: ['30'], status: 'completed' },
          ],
        },
      ],
    });
    const { rows } = await listPlayReleases(cfg);
    expect(rows.map((r) => r.id)).toEqual(['GOOGLE_PLAY:production:40+41', 'GOOGLE_PLAY:production:30', 'GOOGLE_PLAY:internal:45']);
    expect(rows[0]).toEqual({
      id: 'GOOGLE_PLAY:production:40+41', store: 'GOOGLE_PLAY', version: '1.1.0', build_number: '40, 41', state: 'production/inProgress',
      status: 'ROLLING_OUT', track: 'production', review_state: '', created_at: null, submitted_at: null, rollout_pct: 26, store_ref: '1.1.0',
    });
    expect(rows[1]).toMatchObject({ status: 'LIVE', rollout_pct: null });
    expect(rows[2]).toMatchObject({ status: 'TESTING', track: 'internal', store_ref: '1.2.0 (45)' });
  });

  it('copes with a release that has no name, codes or status, and a track with no releases or name', async () => {
    (call as jest.Mock).mockResolvedValue({ tracks: [{ releases: [{}] }, { track: 'beta' }, { track: 'alpha', releases: [{ versionCodes: ['7', '8'] }] }] });
    const { rows } = await listPlayReleases(cfg);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'GOOGLE_PLAY::', version: '', build_number: '', state: '/', status: 'OTHER', track: '', store_ref: '' });
    expect(rows[1]).toMatchObject({ id: 'GOOGLE_PLAY:alpha:7+8', state: 'alpha/', store_ref: '7+8', version: '' });
  });

  it('treats a non-list answer as no tracks', async () => {
    (call as jest.Mock).mockResolvedValue({ tracks: 'x' });
    await expect(listPlayReleases(cfg)).resolves.toMatchObject({ rows: [] });
  });

  it('still discards the edit when the account cannot read the app, and rethrows Google’s words', async () => {
    (call as jest.Mock).mockRejectedValue(new Error('Google Play refused the request (HTTP 403): no access'));
    await expect(listPlayReleases(cfg)).rejects.toThrow('no access');
    expect(discardEdit).toHaveBeenCalledWith('tok', 'com.duncit.app', 'edit1');
  });
});
