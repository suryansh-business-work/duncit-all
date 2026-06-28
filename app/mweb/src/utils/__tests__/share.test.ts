import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildPostUrl, buildProfileUrl, sharePost, shareProfile } from '../share';

const notifySuccess = vi.fn();
vi.mock('../../components/notify', () => ({ notifySuccess: (m: string) => notifySuccess(m) }));

const origin = 'https://mweb.duncit.com';

beforeEach(() => {
  notifySuccess.mockReset();
  vi.stubGlobal('location', { origin });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('share urls', () => {
  it('builds post and profile URLs from the origin', () => {
    expect(buildPostUrl('p1')).toBe(`${origin}/post/p1`);
    expect(buildProfileUrl('u1')).toBe(`${origin}/u/u1`);
  });
});

describe('sharePost / shareProfile', () => {
  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    await sharePost('p1', 'Sunset');
    expect(share).toHaveBeenCalledWith({
      title: 'Sunset',
      text: 'Sunset',
      url: `${origin}/post/p1`,
    });
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to clipboard + toast when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await shareProfile('u1', 'Sam Lee');
    expect(writeText).toHaveBeenCalledWith(`${origin}/u/u1`);
    expect(notifySuccess).toHaveBeenCalledWith('Link copied to clipboard');
  });

  it('swallows a cancelled native share', async () => {
    const share = vi.fn().mockRejectedValue(new Error('cancelled'));
    vi.stubGlobal('navigator', { share });
    await expect(sharePost('p2', 'Hi')).resolves.toBeUndefined();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
