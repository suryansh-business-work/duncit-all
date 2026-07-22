import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const notifySuccess = vi.fn();
vi.mock('../../components/notify', () => ({
  notifySuccess: (msg: string) => notifySuccess(msg),
}));

import { buildPostUrl, buildProfileUrl, sharePost, shareProfile } from '../share';

const ORIGIN = 'https://mweb.duncit.com';

beforeEach(() => {
  notifySuccess.mockClear();
  Object.defineProperty(globalThis.window, 'location', {
    value: { origin: ORIGIN },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Reset navigator overrides
  Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'share');
});

describe('buildPostUrl / buildProfileUrl', () => {
  it('builds the post url from origin', () => {
    expect(buildPostUrl('p1')).toBe(`${ORIGIN}/post/p1`);
  });

  it('builds the profile url from origin', () => {
    expect(buildProfileUrl('u1')).toBe(`${ORIGIN}/u/u1`);
  });
});

describe('sharePost', () => {
  it('uses navigator.share when available', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });

    await sharePost('p1', 'My Post');

    expect(shareSpy).toHaveBeenCalledWith({
      title: 'My Post',
      text: 'My Post',
      url: `${ORIGIN}/post/p1`,
    });
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to clipboard + toast when navigator.share is absent', async () => {
    Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await sharePost('p2', 'Another Post');

    expect(writeText).toHaveBeenCalledWith(`${ORIGIN}/post/p2`);
    expect(notifySuccess).toHaveBeenCalledWith('Link copied to clipboard');
  });

  it('swallows errors (user cancel / clipboard unavailable)', async () => {
    const shareSpy = vi.fn().mockRejectedValue(new Error('AbortError'));
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });

    await expect(sharePost('p3', 'Cancelled')).resolves.toBeUndefined();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('shareProfile', () => {
  it('shares a profile via navigator.share with the "on Duncit" text', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });

    await shareProfile('u9', 'Ada');

    expect(shareSpy).toHaveBeenCalledWith({
      title: 'Ada',
      text: 'Ada on Duncit',
      url: `${ORIGIN}/u/u9`,
    });
  });

  it('falls back to clipboard for a profile', async () => {
    Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await shareProfile('u10', 'Grace');

    expect(writeText).toHaveBeenCalledWith(`${ORIGIN}/u/u10`);
    expect(notifySuccess).toHaveBeenCalledWith('Link copied to clipboard');
  });
});
