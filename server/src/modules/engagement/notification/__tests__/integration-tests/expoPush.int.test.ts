import { Types } from 'mongoose';
import { notificationService } from '../../notification.service';
import { ExpoPushTokenModel } from '../../notification.model';
import { UserModel } from '@modules/access/user/user.model';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('notification expo push', () => {
  it('saves an Expo token (upsert/rebind) for the user', async () => {
    const a = new Types.ObjectId().toString();
    const b = new Types.ObjectId().toString();
    await notificationService.saveExpoPushToken(a, 'ExponentPushToken[abc]', 'android');
    // Same token re-registered by another user rebinds it (one row).
    await notificationService.saveExpoPushToken(b, 'ExponentPushToken[abc]', 'ios');
    const rows = await ExpoPushTokenModel.find({ token: 'ExponentPushToken[abc]' });
    expect(rows).toHaveLength(1);
    expect(String(rows[0].user_id)).toBe(b);

    await expect(notificationService.saveExpoPushToken(a, '  ')).rejects.toThrow(/required/i);
  });

  it('fans a USER notification out to the device via the Expo push API', async () => {
    const user = new Types.ObjectId();
    await UserModel.collection.insertOne({ _id: user, metadata: { status: 'ACTIVE' } } as never);
    await notificationService.saveExpoPushToken(user.toString(), 'ExponentPushToken[xyz]', 'android');

    const fetchMock = jest.fn().mockResolvedValue({ json: async () => ({ data: [{ status: 'ok' }] }) });
    global.fetch = fetchMock as never;

    const notif = await notificationService.create({
      title: 'Pod starting soon',
      body: 'Your pod begins in 30 minutes',
      scope: 'USER',
      target_user_ids: [user.toString()],
      silent: false,
    });

    expect(notif.delivered_count).toBe(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('https://exp.host/--/api/v2/push/send');
    expect(call[1].body).toContain('ExponentPushToken[xyz]');
  });

  it('skips push entirely for a silent notification', async () => {
    const user = new Types.ObjectId();
    await UserModel.collection.insertOne({ _id: user, metadata: { status: 'ACTIVE' } } as never);
    await notificationService.saveExpoPushToken(user.toString(), 'ExponentPushToken[silent]', 'ios');

    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;

    const notif = await notificationService.create({
      title: 'Quiet update',
      body: 'No buzz',
      scope: 'USER',
      target_user_ids: [user.toString()],
      silent: true,
    });
    expect(notif.delivered_count).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
