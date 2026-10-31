import { isValidObjectId } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';

/**
 * The people a marketing record points at — an account's owner, a lead's
 * owner — resolved to names in one lookup per page, and checked to be real
 * before they are stored. Shared by Social Accounts and the lead pipeline so
 * "who is this id" is answered the same way everywhere.
 */
export interface OwnerRef {
  owner_user_id?: unknown;
}

const idOrNull = (value: unknown) => (value ? String(value) : null);

/** Each owner's full name, in one lookup for however many records point at them. */
export async function ownerNamesOf(docs: readonly OwnerRef[]): Promise<Map<string, string>> {
  const ids = [...new Set(docs.map((doc) => idOrNull(doc.owner_user_id)).filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile.first_name profile.last_name')
    .lean<Array<{ _id: unknown; profile?: { first_name?: string; last_name?: string } }>>();
  return new Map(
    users.map((user) => [String(user._id), [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ')])
  );
}

/** True when every id names a living user. */
export async function allUsersExist(ids: readonly string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  if (!ids.every((id) => isValidObjectId(id))) return false;
  const found = await UserModel.countDocuments({ _id: { $in: ids }, 'metadata.deleted_at': null });
  return found === ids.length;
}
