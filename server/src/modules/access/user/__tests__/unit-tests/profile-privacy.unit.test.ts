import { Types } from 'mongoose';

const create = jest.fn();
jest.mock('@modules/engagement/notification/notification.service', () => ({
  notificationService: { create: (...args: unknown[]) => create(...args) },
}));

import { userService } from '../../user.service';

describe('profile privacy helpers (no DB)', () => {
  it('treats invalid ids as not-following / empty / not-viewable', async () => {
    await expect(userService.isFollowing('bad', 'also-bad')).resolves.toBe(false);
    await expect(userService.listFollowingUserIds('bad')).resolves.toEqual([]);
    await expect(userService.canViewContent('bad', null)).resolves.toBe(false);
  });

  it('lets the owner always view their own content', async () => {
    const id = new Types.ObjectId().toString();
    await expect(userService.canViewContent(id, id)).resolves.toBe(true);
  });

  it('rejects an unknown visibility value', async () => {
    const id = new Types.ObjectId().toString();
    await expect(userService.updateMyProfileVisibility(id, 'BOGUS' as never)).rejects.toThrow();
  });
});

describe('notifyNewFollower', () => {
  it('sends a named notification with avatar + deep link', async () => {
    create.mockResolvedValueOnce(undefined);
    const targetId = new Types.ObjectId().toString();
    const followerId = new Types.ObjectId().toString();
    await userService.notifyNewFollower(targetId, {
      user_id: followerId,
      full_name: 'Riya Sharma',
      profile_photo: 'https://img/r.jpg',
    } as never);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New follower',
        body: 'Riya Sharma started following you',
        image_url: 'https://img/r.jpg',
        link_url: `/u/${followerId}`,
        scope: 'USER',
        target_user_ids: [targetId],
      })
    );
  });

  it('falls back to a generic name and null link/image when the follower is unknown', async () => {
    create.mockResolvedValueOnce(undefined);
    await userService.notifyNewFollower('target', null as never);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Someone started following you',
        image_url: null,
        link_url: null,
      })
    );
  });

  it('swallows notification failures', async () => {
    create.mockRejectedValueOnce(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      userService.notifyNewFollower('target', { full_name: 'X' } as never)
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
