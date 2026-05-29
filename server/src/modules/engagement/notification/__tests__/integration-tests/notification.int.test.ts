import { Types } from 'mongoose';
import { notificationService } from '../../notification.service';

describe('notificationService integration', () => {
  it('creates a user-scoped notification and lists it', async () => {
    const target = new Types.ObjectId().toString();
    const created = await notificationService.create({
      title: 'Welcome',
      body: 'Thanks for joining',
      scope: 'USER',
      target_user_ids: [target],
    });
    expect((created as any).title ?? (created as any).id).toBeDefined();

    const list = await notificationService.list();
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('saves and deletes a push subscription', async () => {
    const userId = new Types.ObjectId().toString();
    await notificationService.savePushSubscription(userId, {
      endpoint: 'https://push/endpoint-1',
      p256dh: 'key',
      auth: 'auth',
    });
    expect(await notificationService.deletePushSubscription('https://push/endpoint-1')).toBeDefined();
  });
});
