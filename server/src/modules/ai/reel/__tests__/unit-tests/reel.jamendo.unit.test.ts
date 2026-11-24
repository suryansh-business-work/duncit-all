import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { cacheGet } from '@config/redis';
import { outboundFetch } from '@utils/outboundFetch';
import { commercialLicence, jamendoTrack, licenceLine, searchJamendo, trackCredit, usableTrack, type JamendoTrack } from '../../reel.jamendo';

jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@config/redis', () => ({ cacheGet: jest.fn(), cacheSet: jest.fn() }));
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));
jest.mock('@modules/platform/upload/upload.service', () => ({ importRemoteMedia: jest.fn() }));

const env = getRuntimeEnvValue as jest.Mock;
const fetchMock = outboundFetch as jest.Mock;
const BY_SA = 'http://creativecommons.org/licenses/by-sa/3.0/';

const track = (over: Partial<JamendoTrack> = {}): JamendoTrack => ({
  id: '1532771',
  name: 'Sunday Court',
  artist_name: 'The Rallies',
  duration: 184,
  image: 'https://usercontent.jamendo.com/?type=album&id=1',
  audio: 'https://prod-1.storage.jamendo.com/?trackid=1532771&format=mp31',
  audiodownload: 'https://prod-1.storage.jamendo.com/download/track/1532771/mp32/',
  audiodownload_allowed: true,
  license_ccurl: BY_SA,
  ...over,
});

const reply = (results: JamendoTrack[], status = 'success', error_message = '') => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ headers: { status, error_message }, results }),
});

beforeEach(() => {
  env.mockResolvedValue('abc12345');
  (cacheGet as jest.Mock).mockResolvedValue(null);
});

describe('licences', () => {
  it.each([
    [BY_SA, true],
    ['https://creativecommons.org/licenses/by/4.0/', true],
    ['http://creativecommons.org/licenses/by-nc-sa/3.0/', false],
    ['http://creativecommons.org/licenses/by-nd/3.0/', false],
    ['http://creativecommons.org/licenses/by-nc/3.0/', false],
    ['http://creativecommons.org/licenses/by-nc-nd/3.0/', false],
    ['https://example.com/licence', false],
    [undefined, false],
  ])('%s may be laid under a marketing reel: %s', (url, allowed) => {
    expect(commercialLicence(url)).toBe(allowed);
  });

  it('names the licence and keeps its link, and credits the track and artist', () => {
    expect(licenceLine(BY_SA)).toBe(`CC BY-SA 3.0 — ${BY_SA}`);
    expect(licenceLine('https://example.com/x')).toBe('Creative Commons — https://example.com/x');
    expect(trackCredit(track())).toBe('"Sunday Court" by The Rallies on Jamendo');
    expect(trackCredit(track({ name: '', artist_name: '' }))).toBe('"Untitled" by unknown artist on Jamendo');
  });

  it('uses a track only when it may be downloaded and its licence allows commercial use', () => {
    expect(usableTrack(track())).toBe(true);
    expect(usableTrack(track({ audiodownload_allowed: false }))).toBe(false);
    expect(usableTrack(track({ audiodownload: '' }))).toBe(false);
    expect(usableTrack(track({ license_ccurl: 'http://creativecommons.org/licenses/by-nc/3.0/' }))).toBe(false);
  });
});

describe('searchJamendo', () => {
  it('asks only for commercially usable tracks and lists the usable ones with licence and credit', async () => {
    fetchMock.mockResolvedValue(reply([track(), track({ id: '2', audiodownload_allowed: false })]));
    const page = await searchJamendo({ query: 'acoustic', page: 3, perPage: 2 });
    const url = new URL(fetchMock.mock.calls[0][1]);
    expect(url.searchParams.get('client_id')).toBe('abc12345');
    expect(url.searchParams.get('ccnc')).toBe('false');
    expect(url.searchParams.get('ccnd')).toBe('false');
    expect(url.searchParams.get('offset')).toBe('4');
    expect(url.searchParams.get('search')).toBe('acoustic');
    expect(page.items).toEqual([
      {
        id: 'jamendo-1532771',
        kind: 'AUDIO',
        url: track().audio,
        preview_url: track().image,
        width: 0,
        height: 0,
        duration_ms: 184_000,
        licence: `CC BY-SA 3.0 — ${BY_SA}`,
        attribution: '"Sunday Court" by The Rallies on Jamendo',
        provider_id: '1532771',
        provider: 'JAMENDO',
      },
    ]);
    // A full page from Jamendo means there may be more, even if some were left out.
    expect(page.has_more).toBe(true);
  });

  it('refuses without a client id, and reports Jamendo\'s own error', async () => {
    env.mockResolvedValueOnce('');
    await expect(searchJamendo({ query: 'x', page: 1, perPage: 24 })).rejects.toMatchObject({ extensions: { code: 'CONFIG_ERROR', env_category: 'JAMENDO' } });
    fetchMock.mockResolvedValue(reply([], 'failed', 'Your credential is not valid'));
    await expect(searchJamendo({ query: 'x', page: 1, perPage: 24 })).rejects.toMatchObject({
      message: expect.stringContaining('Your credential is not valid'),
      extensions: { code: 'UPSTREAM_ERROR' },
    });
  });
});

describe('jamendoTrack', () => {
  it('reads one track by id, or null when it is gone', async () => {
    fetchMock.mockResolvedValueOnce(reply([track()]));
    await expect(jamendoTrack('1532771')).resolves.toMatchObject({ id: '1532771' });
    expect(new URL(fetchMock.mock.calls[0][1]).searchParams.get('id')).toBe('1532771');
    fetchMock.mockResolvedValueOnce(reply([]));
    await expect(jamendoTrack('404')).resolves.toBeNull();
  });
});
