import { Types } from 'mongoose';
import { notificationService } from '../../notification.service';
import { audienceListService } from '@modules/crm/marketing/audienceList.service';
import { UserModel } from '@modules/access/user/user.model';

let seq = 0;

const seedUser = (city: string) => {
  seq += 1;
  return UserModel.create({
    auth: { email: `notif${seq}@x.com` },
    profile: { first_name: 'Ana', last_name: `N${seq}`, city },
    metadata: { status: 'ACTIVE', role_keys: ['USER'] },
  });
};

/**
 * A saved marketing list is a notification audience. Its members are resolved
 * from the stored criteria at send time, never frozen onto the notification.
 */
describe('notification AUDIENCE_LIST scope', () => {
  const puneList = () =>
    audienceListService.create({
      name: 'Pune',
      owner: 'Asha',
      filters: [{ field: 'city', op: 'eq', value: 'Pune' }],
    });

  it('resolves the people who match the list right now', async () => {
    const a = await seedUser('Pune');
    const b = await seedUser('Pune');
    await seedUser('Delhi');
    const list = await puneList();

    const ids = await notificationService.resolveTargetUsers({
      scope: 'AUDIENCE_LIST',
      audience_list_id: list.id,
    });
    expect(ids.sort()).toEqual([String(a._id), String(b._id)].sort());
  });

  // The point of a live segment: a signup after the list was built is included.
  it('picks up a matching signup made after the list was saved', async () => {
    await seedUser('Pune');
    const list = await puneList();
    expect(await notificationService.resolveTargetUsers({ scope: 'AUDIENCE_LIST', audience_list_id: list.id })).toHaveLength(1);

    await seedUser('Pune');
    expect(await notificationService.resolveTargetUsers({ scope: 'AUDIENCE_LIST', audience_list_id: list.id })).toHaveLength(2);
  });

  it('refuses to create the notification without a list', async () => {
    await expect(
      notificationService.create({ title: 'Hi', body: 'There', scope: 'AUDIENCE_LIST' }),
    ).rejects.toThrow(/audience_list_id required/i);
  });

  it('reports a list that no longer exists rather than sending to nobody', async () => {
    await expect(
      notificationService.resolveTargetUsers({
        scope: 'AUDIENCE_LIST',
        audience_list_id: new Types.ObjectId().toString(),
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('stores the list on the notification and sends to its members', async () => {
    await seedUser('Pune');
    const list = await puneList();

    const notif = await notificationService.create({
      title: 'Pune only',
      body: 'A message',
      scope: 'AUDIENCE_LIST',
      audience_list_id: list.id,
      silent: true,
    });
    expect(notif.scope).toBe('AUDIENCE_LIST');
    expect(notif.audience_list_id).toBe(list.id);
  });
});
