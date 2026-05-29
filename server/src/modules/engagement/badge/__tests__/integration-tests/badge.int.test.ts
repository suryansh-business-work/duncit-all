import { Types } from 'mongoose';
import { badgeService } from '../../badge.service';
import { BadgeModel } from '../../badge.model';

describe('badgeService integration', () => {
  it('creates, lists, updates and removes a badge', async () => {
    const created = await badgeService.create({ title: 'First Pod', condition_type: 'POD_JOIN_COUNT', threshold: 1 });
    expect(created.badge_id).toMatch(/^first-pod/);

    expect(await badgeService.list()).toHaveLength(1);
    expect((await badgeService.getById(created.id))?.title).toBe('First Pod');

    const updated = await badgeService.update(created.id, { title: 'First Pod Joined' });
    expect(updated.title).toBe('First Pod Joined');

    expect(await badgeService.remove(created.id)).toBe(true);
    expect(await BadgeModel.countDocuments()).toBe(0);
  });

  it('prevents duplicate badge ids', async () => {
    await badgeService.create({ badge_id: 'host-hero', title: 'Host Hero', condition_type: 'POD_HOST_COUNT' });
    await expect(
      badgeService.create({ badge_id: 'host-hero', title: 'dup', condition_type: 'POD_HOST_COUNT' })
    ).rejects.toThrow(/already exists/i);
  });

  it('awards and revokes a manual badge, reflected in listForUser', async () => {
    const userId = new Types.ObjectId().toString();
    const badge = await badgeService.create({ title: 'VIP', condition_type: 'MANUAL' });

    await badgeService.awardManually(userId, badge.id, 'great member');
    const list = await badgeService.listForUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0].badge?.title).toBe('VIP');

    expect(await badgeService.revoke(userId, badge.id)).toBe(true);
    expect(await badgeService.listForUser(userId)).toHaveLength(0);
  });

  it('does not award a condition badge when the metric is below threshold', async () => {
    const userId = new Types.ObjectId().toString();
    await badgeService.create({ title: 'Ten Pods', condition_type: 'POD_JOIN_COUNT', threshold: 10 });
    expect(await badgeService.listForUser(userId)).toHaveLength(0);
  });
});
