import { Share } from 'react-native';
import { clearShareLinkCache } from '@duncit/utils';

import { graphqlRequest } from '@/services/graphql.client';
import { POD_WEB_BASE } from '@/utils/pod-format';
import { buildPostUrl, buildProfileUrl, sharePost, shareProfile } from '@/utils/share';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const shareSpy = jest.spyOn(Share, 'share');
const request = graphqlRequest as jest.Mock;

beforeEach(() => {
  shareSpy.mockReset();
  request.mockReset();
  clearShareLinkCache();
});

describe('share urls', () => {
  it('builds post and profile URLs from the configured web base', () => {
    expect(POD_WEB_BASE).toMatch(/^https?:\/\//);
    expect(buildPostUrl('p1')).toBe(`${POD_WEB_BASE}/post/p1`);
    expect(buildProfileUrl('u1')).toBe(`${POD_WEB_BASE}/u/u1`);
  });
});

describe('sharePost', () => {
  it('shares the tracked short link the server mints for the post', async () => {
    request.mockResolvedValue({ shareLink: { url: 'https://duncit.com/s/abc' } });
    shareSpy.mockResolvedValue({ action: 'sharedAction' } as never);
    await sharePost('p1', 'Sunset');
    expect(request).toHaveBeenCalledWith(
      expect.anything(),
      { target: 'POST', ref: 'p1' },
      { auth: true },
    );
    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Sunset\nhttps://duncit.com/s/abc',
      url: 'https://duncit.com/s/abc',
      title: 'Sunset',
    });
  });

  it('falls back to the plain post URL when the link cannot be minted', async () => {
    request.mockRejectedValue(new Error('network down'));
    shareSpy.mockResolvedValue({ action: 'sharedAction' } as never);
    await sharePost('p1', 'Sunset');
    expect(shareSpy).toHaveBeenCalledWith({
      message: `Sunset\n${POD_WEB_BASE}/post/p1`,
      url: `${POD_WEB_BASE}/post/p1`,
      title: 'Sunset',
    });
  });

  it('swallows a cancelled share', async () => {
    request.mockResolvedValue(null);
    shareSpy.mockRejectedValue(new Error('cancelled'));
    await expect(sharePost('p2', 'Hi')).resolves.toBeUndefined();
  });
});

describe('shareProfile', () => {
  it('opens the share sheet with the readable /u/:handle URL, never a tracked link', async () => {
    shareSpy.mockResolvedValue({ action: 'sharedAction' } as never);
    await shareProfile('u1', 'Sam Lee', 'samlee');
    expect(request).not.toHaveBeenCalled();
    expect(shareSpy).toHaveBeenCalledWith({
      message: `Sam Lee on Duncit\n${POD_WEB_BASE}/u/samlee`,
      url: `${POD_WEB_BASE}/u/samlee`,
      title: 'Sam Lee',
    });
  });

  it('falls back to the user id when the account has no handle', async () => {
    shareSpy.mockResolvedValue({ action: 'sharedAction' } as never);
    await shareProfile('u1', 'Sam Lee');
    expect(shareSpy).toHaveBeenCalledWith({
      message: `Sam Lee on Duncit\n${POD_WEB_BASE}/u/u1`,
      url: `${POD_WEB_BASE}/u/u1`,
      title: 'Sam Lee',
    });
  });

  it('swallows a cancelled share', async () => {
    shareSpy.mockRejectedValue(new Error('cancelled'));
    await expect(shareProfile('u2', 'X')).resolves.toBeUndefined();
  });
});
