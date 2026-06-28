import { Share } from 'react-native';

import { buildPostUrl, buildProfileUrl, sharePost, shareProfile } from '@/utils/share';

const shareSpy = jest.spyOn(Share, 'share');

beforeEach(() => shareSpy.mockReset());

describe('share urls', () => {
  it('builds post and profile URLs from the web base', () => {
    expect(buildPostUrl('p1')).toBe('https://mweb.duncit.com/post/p1');
    expect(buildProfileUrl('u1')).toBe('https://mweb.duncit.com/u/u1');
  });
});

describe('sharePost', () => {
  it('opens the share sheet with the post URL', async () => {
    shareSpy.mockResolvedValue({ action: 'sharedAction' } as never);
    await sharePost('p1', 'Sunset');
    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Sunset\nhttps://mweb.duncit.com/post/p1',
      url: 'https://mweb.duncit.com/post/p1',
      title: 'Sunset',
    });
  });

  it('swallows a cancelled share', async () => {
    shareSpy.mockRejectedValue(new Error('cancelled'));
    await expect(sharePost('p2', 'Hi')).resolves.toBeUndefined();
  });
});

describe('shareProfile', () => {
  it('opens the share sheet with the profile URL', async () => {
    shareSpy.mockResolvedValue({ action: 'sharedAction' } as never);
    await shareProfile('u1', 'Sam Lee');
    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Sam Lee on Duncit\nhttps://mweb.duncit.com/u/u1',
      url: 'https://mweb.duncit.com/u/u1',
      title: 'Sam Lee',
    });
  });

  it('swallows a cancelled share', async () => {
    shareSpy.mockRejectedValue(new Error('cancelled'));
    await expect(shareProfile('u2', 'X')).resolves.toBeUndefined();
  });
});
