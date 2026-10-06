import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSiteTranslator = vi.fn();
const siteT = (key: string) => `bundled:${key}`;
vi.mock('@duncit/brand/site-i18n', () => ({ getSiteTranslator: (...args: unknown[]) => getSiteTranslator(...args), siteT }));
vi.mock('./cms-api', () => ({ graphqlUrl: () => 'http://api.internal/graphql' }));

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-06T10:00:00Z'));
});

afterEach(() => {
  getSiteTranslator.mockReset();
  vi.useRealTimers();
});

describe('translator', () => {
  it('loads server localization once for many concurrent pages, then reuses it', async () => {
    const t = (key: string) => `server:${key}`;
    getSiteTranslator.mockResolvedValue({ t });
    const { translator, SITE_LOCALE } = await import('./translator');
    const [first, second] = await Promise.all([translator(), translator()]);
    expect(first).toBe(t);
    expect(second).toBe(t);
    await expect(translator()).resolves.toBe(t);
    expect(getSiteTranslator).toHaveBeenCalledTimes(1);
    expect(getSiteTranslator).toHaveBeenCalledWith('http://api.internal/graphql', SITE_LOCALE);
  });

  it('reloads after five minutes', async () => {
    getSiteTranslator.mockResolvedValue({ t: siteT });
    const { translator } = await import('./translator');
    await translator();
    vi.setSystemTime(new Date('2026-10-06T10:05:01Z'));
    await translator();
    expect(getSiteTranslator).toHaveBeenCalledTimes(2);
  });

  it('falls back to the bundled copy when the server is down, and tries again next time', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const down = new Error('down');
    getSiteTranslator.mockRejectedValueOnce(down);
    const { translator } = await import('./translator');
    await expect(translator()).resolves.toBe(siteT);
    expect(warn).toHaveBeenCalledWith('[cms-site] server localization unavailable, using the bundled copy', down);
    warn.mockRestore();
    getSiteTranslator.mockResolvedValueOnce({ t: siteT });
    await translator();
    expect(getSiteTranslator).toHaveBeenCalledTimes(2);
  });
});
