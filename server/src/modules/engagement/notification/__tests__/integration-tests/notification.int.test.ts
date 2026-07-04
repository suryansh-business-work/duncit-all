import { Types } from 'mongoose';
import { notificationService } from '../../notification.service';
import { NotificationModel, UserNotificationModel } from '../../notification.model';

describe('notificationService integration', () => {
  it('listForUser drops deleted and content-less notifications', async () => {
    const userId = new Types.ObjectId();
    const now = new Date();
    const withContent = await NotificationModel.create({
      title: 'Has title',
      body: 'And body',
      scope: 'GLOBAL',
    });
    // Legacy junk rows predate the required-title constraint, so insert them via
    // the raw driver to bypass schema validation.
    const bodyOnlyId = new Types.ObjectId();
    const blankId = new Types.ObjectId();
    await NotificationModel.collection.insertMany([
      { _id: bodyOnlyId, title: '', body: 'Only a body', scope: 'GLOBAL', silent: false, target_user_ids: [], delivered_count: 0, failed_count: 0, created_at: now, updated_at: now },
      { _id: blankId, title: '  ', body: '  ', scope: 'GLOBAL', silent: false, target_user_ids: [], delivered_count: 0, failed_count: 0, created_at: now, updated_at: now },
    ]);
    const missingId = new Types.ObjectId(); // no Notification doc → populates to null
    await UserNotificationModel.create([
      { user_id: userId, notification_id: withContent._id, read_at: null },
      { user_id: userId, notification_id: bodyOnlyId, read_at: null },
      { user_id: userId, notification_id: blankId, read_at: null },
      { user_id: userId, notification_id: missingId, read_at: null },
    ]);

    const list = await notificationService.listForUser(userId.toString());
    // Kept: the titled one + the body-only one. Dropped: blank-both + deleted.
    expect(list).toHaveLength(2);
    const titles = list.map((n) => n.notification!.title);
    expect(titles).toContain('Has title');
    expect(titles).toContain('');
  });


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
