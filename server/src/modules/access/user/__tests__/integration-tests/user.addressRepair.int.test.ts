import { Types } from 'mongoose';
import { UserModel } from '../../user.model';
import { UserChangeLogModel } from '@modules/access/userAudit/userAudit.model';
import { repairWipedAddresses } from '../../user.addressRepair';

let seq = 0;
async function seedUser(address: Record<string, string>) {
  seq += 1;
  return UserModel.create({
    auth: { email: `repair${seq}@x.com` },
    profile: { first_name: 'Asha', profile_photo: null, address },
    metadata: { status: 'ACTIVE' },
  });
}

/** One write in the change log: several field rows sharing a timestamp. */
async function logWrite(
  userId: Types.ObjectId,
  at: Date,
  rows: [field: string, oldValue: string, newValue: string][],
  actor: 'USER' | 'ADMIN' = 'USER'
) {
  await UserChangeLogModel.insertMany(
    rows.map(([field, old_value, new_value]) => ({
      user_id: userId,
      field,
      old_value,
      new_value,
      action: 'UPDATE',
      actor_type: actor,
      source: 'NATIVE',
      created_at: at,
    }))
  );
}

const PHOTO = 'profile.profile_photo';
const addressOf = async (id: Types.ObjectId) =>
  ((await UserModel.findById(id).lean()) as { profile?: { address?: Record<string, string> } })?.profile?.address ?? {};

describe('repairWipedAddresses', () => {
  it('restores the parts a photo-only save blanked, and logs the restore', async () => {
    const user = await seedUser({ line1: '', city: '', country: 'India' });
    await logWrite(user._id, new Date('2026-10-15T10:00:00Z'), [
      [PHOTO, 'https://img.test/a.jpg', ''],
      ['profile.address.line1', '12 MG Road', ''],
      ['profile.address.city', 'Pune', ''],
    ]);

    await expect(repairWipedAddresses()).resolves.toEqual({ users: 1, parts: 2 });
    expect(await addressOf(user._id)).toMatchObject({ line1: '12 MG Road', city: 'Pune', country: 'India' });
    const restoreLog = await UserChangeLogModel.find({ user_id: user._id, new_value: '12 MG Road' }).lean();
    expect(restoreLog).toHaveLength(1);
  });

  it('keeps what the member re-entered and what they cleared on purpose later', async () => {
    const user = await seedUser({ line1: 'New House 7', city: '', state: '' });
    await logWrite(user._id, new Date('2026-10-01T10:00:00Z'), [
      [PHOTO, 'https://img.test/a.jpg', ''],
      ['profile.address.line1', 'Old House 1', ''],
      ['profile.address.city', 'Pune', ''],
      ['profile.address.state', 'Maharashtra', ''],
    ]);
    // Later: line1 typed in again, and state set then deliberately cleared.
    await logWrite(user._id, new Date('2026-10-02T10:00:00Z'), [['profile.address.line1', '', 'New House 7']]);
    await logWrite(user._id, new Date('2026-10-03T10:00:00Z'), [['profile.address.state', 'Goa', '']]);

    await expect(repairWipedAddresses()).resolves.toEqual({ users: 1, parts: 1 });
    expect(await addressOf(user._id)).toMatchObject({ line1: 'New House 7', city: 'Pune', state: '' });
  });

  it('never overwrites a part that holds a value, even one written without a log row', async () => {
    // e.g. filled in by an import or a write path that keeps no change log.
    const user = await seedUser({ city: 'Lucknow' });
    await logWrite(user._id, new Date('2026-10-07T10:00:00Z'), [
      [PHOTO, 'https://img.test/a.jpg', ''],
      ['profile.address.city', 'Pune', ''],
    ]);
    await expect(repairWipedAddresses()).resolves.toEqual({ users: 0, parts: 0 });
    expect((await addressOf(user._id)).city).toBe('Lucknow');
  });

  it('ignores blanks that were not the bug: no photo change in the write, or an admin edit', async () => {
    const own = await seedUser({ city: '' });
    await logWrite(own._id, new Date('2026-10-05T10:00:00Z'), [['profile.address.city', 'Pune', '']]);
    const byAdmin = await seedUser({ city: '' });
    await logWrite(
      byAdmin._id,
      new Date('2026-10-05T10:00:00Z'),
      [
        [PHOTO, 'https://img.test/a.jpg', ''],
        ['profile.address.city', 'Pune', ''],
      ],
      'ADMIN'
    );

    await expect(repairWipedAddresses()).resolves.toEqual({ users: 0, parts: 0 });
    expect((await addressOf(own._id)).city).toBe('');
    expect((await addressOf(byAdmin._id)).city).toBe('');
  });

  it('does nothing on a second run', async () => {
    const user = await seedUser({ pincode: '' });
    await logWrite(user._id, new Date('2026-10-06T10:00:00Z'), [
      [PHOTO, 'https://img.test/a.jpg', ''],
      ['profile.address.pincode', '201003', ''],
    ]);
    await expect(repairWipedAddresses()).resolves.toEqual({ users: 1, parts: 1 });
    await expect(repairWipedAddresses()).resolves.toEqual({ users: 0, parts: 0 });
    expect((await addressOf(user._id)).pincode).toBe('201003');
  });
});
