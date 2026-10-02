import { MEDIA_TTL_SECONDS, reelMediaLinks, verifyMediaToken } from '../../reel.media';

jest.mock('@config/url-configs', () => ({
  getUrlConfigs: async () => ({ serverUrl: 'https://server.duncit.com/' }),
}));

const SIX_HOURS = 6 * 60 * 60 * 1000;
/** A moment exactly on a window boundary, so offsets from it are easy to reason about. */
const WINDOW_START = SIX_HOURS * 80_000;

const tokenOf = (url: string): string => url.slice(url.lastIndexOf('/') + 1);

describe('reelMediaLinks', () => {
  afterEach(() => jest.restoreAllMocks());

  it('builds media and thumbnail links on this server', async () => {
    const links = await reelMediaLinks();
    expect(links.media('drive-file-1')).toMatch(/^https:\/\/server\.duncit\.com\/reels\/media\/[\w-]+\.[\w-]+$/);
    expect(links.thumbnail('drive-file-1')).toMatch(/^https:\/\/server\.duncit\.com\/reels\/thumbnail\/[\w-]+\.[\w-]+$/);
  });

  it('signs a link that names its file and nothing else', async () => {
    const links = await reelMediaLinks();
    const token = tokenOf(links.media('drive-file-1'));
    expect(verifyMediaToken(token)).toBe('drive-file-1');
    expect(verifyMediaToken(`${token}x`)).toBeNull();
    expect(verifyMediaToken('')).toBeNull();
  });

  it('gives the same file the same link for a whole window, and a new one in the next', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(WINDOW_START + 1000);
    const early = (await reelMediaLinks()).media('drive-file-1');
    now.mockReturnValue(WINDOW_START + SIX_HOURS - 1000);
    const late = (await reelMediaLinks()).media('drive-file-1');
    now.mockReturnValue(WINDOW_START + SIX_HOURS + 1000);
    const next = (await reelMediaLinks()).media('drive-file-1');
    expect(late).toBe(early);
    expect(next).not.toBe(early);
  });

  it('keeps a link alive for between one and two windows', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(WINDOW_START + 1000);
    const token = tokenOf((await reelMediaLinks()).media('drive-file-1'));
    now.mockReturnValue(WINDOW_START + 2 * SIX_HOURS - 1000);
    expect(verifyMediaToken(token)).toBe('drive-file-1');
    now.mockReturnValue(WINDOW_START + 2 * SIX_HOURS + 1000);
    expect(verifyMediaToken(token)).toBeNull();
  });

  it('lets a browser keep the bytes for one window', () => {
    expect(MEDIA_TTL_SECONDS).toBe(SIX_HOURS / 1000);
  });
});
