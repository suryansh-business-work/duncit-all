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

  it('serves the notificationsTable page with search, filter, sort and paging', async () => {
    await NotificationModel.create({ title: 'Alpha promo', body: 'First body', scope: 'GLOBAL', delivered_count: 5 });
    await NotificationModel.create({ title: 'Beta news', body: 'Second body', scope: 'LOCATION', location_id: new Types.ObjectId(), delivered_count: 2 });
    await NotificationModel.create({ title: 'Gamma alert', body: 'Third body', scope: 'GLOBAL', delivered_count: 9 });

    // Plain envelope with the clamp defaults.
    const all = await notificationService.table();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans title and body.
    const byTitle = await notificationService.table({ search: 'beta' });
    expect(byTitle.rows.map((n) => n.title)).toEqual(['Beta news']);
    const byBody = await notificationService.table({ search: 'third body' });
    expect(byBody.rows.map((n) => n.title)).toEqual(['Gamma alert']);

    // Enum filter narrows.
    const global = await notificationService.table({
      filters: [{ field: 'scope', op: 'eq', value: 'GLOBAL' }],
      sort_by: 'title',
      sort_dir: 'asc',
    });
    expect(global.rows.map((n) => n.title)).toEqual(['Alpha promo', 'Gamma alert']);
    expect(global.total).toBe(2);

    // Allowlisted numeric sort.
    const byDelivered = await notificationService.table({ sort_by: 'delivered_count', sort_dir: 'desc' });
    expect(byDelivered.rows.map((n) => n.delivered_count)).toEqual([9, 5, 2]);

    // Paging keeps total and reports the clamped page/page_size back.
    const page2 = await notificationService.table({ page: 2, page_size: 1, sort_by: 'title', sort_dir: 'asc' });
    expect(page2.rows.map((n) => n.title)).toEqual(['Beta news']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
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
