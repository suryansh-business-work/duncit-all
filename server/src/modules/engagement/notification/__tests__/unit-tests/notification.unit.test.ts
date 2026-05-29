import { notificationService } from '../../notification.service';
import { notificationResolvers } from '../../notification.resolver';
import { makeContext } from '@test/harness';

describe('notification unit', () => {
  it('create requires a title and body', async () => {
    await expect(notificationService.create({ body: 'x', scope: 'GLOBAL' })).rejects.toThrow(/title required/i);
    await expect(notificationService.create({ title: 'x', scope: 'GLOBAL' })).rejects.toThrow(/body required/i);
  });

  it('create enforces scope-specific fields', async () => {
    await expect(
      notificationService.create({ title: 'T', body: 'B', scope: 'USER', target_user_ids: [] })
    ).rejects.toThrow(/target_user_ids required/i);
    await expect(
      notificationService.create({ title: 'T', body: 'B', scope: 'ZONE', location_id: 'l' })
    ).rejects.toThrow(/zone_name required/i);
  });

  it('notifications query is gated to admin roles', async () => {
    await expect(
      (notificationResolvers.Query as any).notifications({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('myNotifications requires authentication', async () => {
    await expect(
      (notificationResolvers.Query as any).myNotifications({}, {}, makeContext(null))
    ).rejects.toThrow(/authenticat/i);
  });
});
