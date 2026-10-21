import { Types } from 'mongoose';
import { UserModel } from './user.model';
import { UserChangeLogModel } from '@modules/access/userAudit/userAudit.model';
import { userAuditService } from '@modules/access/userAudit/userAudit.service';

/**
 * Put back the address parts the profile-photo bug blanked.
 *
 * Until a674d8e26 the profile validator filled an absent `address` in as {},
 * and the service wrote it — so a member's own save that changed only the
 * photo blanked their saved address in the same write. The change log kept
 * every old value, which is what this restores from.
 *
 * Deliberately narrow, so it can run on every boot:
 * - only a write the member made themselves that moved the photo AND blanked
 *   address parts (the bug's exact signature);
 * - only a part that is STILL blank today — anything re-entered since wins;
 * - only a part nothing touched after the wipe, so a later deliberate clear
 *   stays cleared.
 * A second run finds nothing to do. Every restore is written to the change log.
 */

const PARTS = ['line1', 'line2', 'landmark', 'city', 'state', 'pincode'] as const;
const ADDRESS_FIELDS = PARTS.map((part) => `profile.address.${part}`);

interface LogRow {
  user_id: Types.ObjectId;
  field: string;
  old_value: string;
  new_value: string;
  created_at: Date;
}

const writeKey = (row: Pick<LogRow, 'user_id' | 'created_at'>) => `${String(row.user_id)}@${row.created_at.getTime()}`;

/** Per user, per part: the value the bug blanked, from its latest such write. */
async function wipedParts(): Promise<Map<string, Map<string, { value: string; at: number }>>> {
  const blanked = await UserChangeLogModel.find({
    field: { $in: ADDRESS_FIELDS },
    actor_type: 'USER',
    new_value: '',
    old_value: { $ne: '' },
  })
    .select('user_id field old_value new_value created_at')
    .lean<LogRow[]>();
  if (blanked.length === 0) return new Map();
  const photoWrites = await UserChangeLogModel.find({
    field: 'profile.profile_photo',
    actor_type: 'USER',
    user_id: { $in: [...new Set(blanked.map((row) => String(row.user_id)))].map((id) => new Types.ObjectId(id)) },
  })
    .select('user_id created_at')
    .lean<Pick<LogRow, 'user_id' | 'created_at'>[]>();
  const bugWrites = new Set(photoWrites.map(writeKey));

  const wiped = new Map<string, Map<string, { value: string; at: number }>>();
  for (const row of blanked) {
    if (!bugWrites.has(writeKey(row))) continue;
    const user = String(row.user_id);
    const parts = wiped.get(user) ?? new Map<string, { value: string; at: number }>();
    const part = row.field.slice('profile.address.'.length);
    const at = row.created_at.getTime();
    if ((parts.get(part)?.at ?? -1) < at) parts.set(part, { value: row.old_value, at });
    wiped.set(user, parts);
  }
  return wiped;
}

/** When each address part of each user was last written, by anyone. */
async function lastWrites(userIds: string[]): Promise<Map<string, number>> {
  const rows = await UserChangeLogModel.aggregate<{ _id: { user: Types.ObjectId; field: string }; at: Date }>([
    {
      $match: {
        user_id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        field: { $in: ADDRESS_FIELDS },
      },
    },
    { $group: { _id: { user: '$user_id', field: '$field' }, at: { $max: '$created_at' } } },
  ]);
  return new Map(rows.map((row) => [`${String(row._id.user)}:${row._id.field}`, row.at.getTime()]));
}

export async function repairWipedAddresses(): Promise<{ users: number; parts: number }> {
  const wiped = await wipedParts();
  if (wiped.size === 0) return { users: 0, parts: 0 };
  const latest = await lastWrites([...wiped.keys()]);
  // Each user is read, written and logged on their own, so they repair side by side.
  const restored = await Promise.all(
    [...wiped].map(([userId, blanked]) => restoreUser(userId, blanked, latest))
  );
  return {
    users: restored.filter((count) => count > 0).length,
    parts: restored.reduce((sum, count) => sum + count, 0),
  };
}

/** Restore one user's still-blank, untouched parts; answers how many were put back. */
async function restoreUser(
  userId: string,
  blanked: Map<string, { value: string; at: number }>,
  latest: Map<string, number>
): Promise<number> {
  const before = await UserModel.findById(userId).lean<{ profile?: { address?: Record<string, unknown> } }>();
  if (!before) return 0;
  const current = before.profile?.address ?? {};
  const set: Record<string, string> = {};
  for (const [part, { value, at }] of blanked) {
    const field = `profile.address.${part}`;
    const untouchedSince = (latest.get(`${userId}:${field}`) ?? at) <= at;
    if (untouchedSince && !current[part]) set[field] = value;
  }
  const count = Object.keys(set).length;
  if (count === 0) return 0;
  const after = await UserModel.findByIdAndUpdate(userId, { $set: set }, { new: true });
  await userAuditService.record({ userId, before, after });
  return count;
}
