import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CmsRenderResult } from '@duncit/gql-types';

const errorPage = vi.fn<(host: string, code: number) => Promise<CmsRenderResult | null>>();
vi.mock('./cms-api', () => ({ errorPage: (host: string, code: number) => errorPage(host, code) }));

const { cachedErrorPage, rememberErrorPages } = await import('./error-pages');

const page = (status: number) => ({ status, title: `Error ${status}` }) as CmsRenderResult;
const settle = () => vi.waitFor(() => expect(errorPage).toHaveBeenCalled());

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-06T10:00:00Z'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  errorPage.mockReset();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('error pages cache', () => {
  it('has nothing for a site it has not seen', () => {
    expect(cachedErrorPage('new.example', 500)).toBeNull();
  });

  it('keeps the pages a site designed, and only those', async () => {
    errorPage.mockImplementation(async (_host, code) => (code === 503 ? page(503) : null));
    rememberErrorPages('a.example');
    await settle();
    await vi.waitFor(() => expect(cachedErrorPage('a.example', 503)).toEqual(page(503)));
    expect(cachedErrorPage('a.example', 500)).toBeNull();
    expect(errorPage.mock.calls).toEqual([
      ['a.example', 500],
      ['a.example', 503],
    ]);
  });

  it('refreshes at most every five minutes, and never twice at once', async () => {
    const pending: (() => void)[] = [];
    errorPage.mockImplementation((_host, code) => new Promise((resolve) => pending.push(() => resolve(page(code)))));
    rememberErrorPages('b.example');
    // A second visit while the first refresh is in flight does not start another.
    rememberErrorPages('b.example');
    expect(errorPage).toHaveBeenCalledTimes(2);
    for (const finish of pending) finish();
    await vi.waitFor(() => expect(cachedErrorPage('b.example', 500)).toEqual(page(500)));

    errorPage.mockClear();
    rememberErrorPages('b.example');
    expect(errorPage).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.setSystemTime(new Date('2026-10-06T10:06:00Z'));
    rememberErrorPages('b.example');
    expect(errorPage).toHaveBeenCalledTimes(2);
  });

  it('logs a failed refresh and keeps serving the visit', async () => {
    errorPage.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(null);
    rememberErrorPages('c.example');
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledWith('[cms-site] error pages refresh failed', { host: 'c.example', reason: 'down' }));

    errorPage.mockRejectedValue('offline');
    rememberErrorPages('c.example');
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledWith('[cms-site] error pages refresh failed', { host: 'c.example', reason: 'offline' }));
    expect(cachedErrorPage('c.example', 500)).toBeNull();
  });
});
