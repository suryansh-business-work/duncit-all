import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APP_SCREENSHOTS_QUERY,
  MAX_SCREENSHOTS,
  SCREENSHOTS_TTL_MS,
  cleanScreenshots,
  fetchAppScreenshots,
  resetAppScreenshotsCache,
} from '../src/app-screenshots';

const API = 'https://api.test/graphql';
const ok = (appScreenshots: unknown) => ({ ok: true, json: async () => ({ data: { appScreenshots } }) });

beforeEach(() => resetAppScreenshotsCache());
afterEach(() => vi.restoreAllMocks());

describe('cleanScreenshots', () => {
  it('keeps https image addresses only, once each, in order', () => {
    expect(cleanScreenshots(['https://a/1.png', 'http://a/2.png', 'https://a/1.png', 7, null, 'https://a/3.png'])).toEqual([
      'https://a/1.png',
      'https://a/3.png',
    ]);
  });

  it('caps the slider at the stores’ own eight', () => {
    const many = Array.from({ length: MAX_SCREENSHOTS + 3 }, (_, i) => `https://a/${i}.png`);
    expect(cleanScreenshots(many)).toHaveLength(MAX_SCREENSHOTS);
  });

  it('answers an empty list for anything that is not a list', () => {
    expect(cleanScreenshots(undefined)).toEqual([]);
    expect(cleanScreenshots('https://a/1.png')).toEqual([]);
  });
});

describe('fetchAppScreenshots', () => {
  it('asks the API for the public screenshots and returns the clean list', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(['https://a/1.png', 'ftp://a/2.png']));
    await expect(fetchAppScreenshots(API, fetchImpl)).resolves.toEqual(['https://a/1.png']);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(API);
    expect(JSON.parse(init.body)).toEqual({ query: APP_SCREENSHOTS_QUERY });
  });

  it('answers nothing without an API, and never calls one', async () => {
    const fetchImpl = vi.fn();
    await expect(fetchAppScreenshots(null, fetchImpl)).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('falls back to the drawn phone when the API refuses or omits the field', async () => {
    await expect(fetchAppScreenshots(API, vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))).resolves.toEqual([]);
    resetAppScreenshotsCache();
    await expect(fetchAppScreenshots(API, vi.fn().mockResolvedValue({ ok: true, json: async () => null }))).resolves.toEqual([]);
  });

  it('falls back, and says why, when the API is unreachable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(fetchAppScreenshots(API, vi.fn().mockRejectedValue(new Error('offline')))).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
  });

  it('asks once per window and again after it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(['https://a/1.png']));
    await fetchAppScreenshots(API, fetchImpl, 0);
    await fetchAppScreenshots(API, fetchImpl, SCREENSHOTS_TTL_MS - 1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await fetchAppScreenshots(API, fetchImpl, SCREENSHOTS_TTL_MS);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
