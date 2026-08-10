import { Types } from 'mongoose';
import { UserModel } from './user.model';

export interface UserDisplay {
  name: string;
  photo: string;
}

const BLANK: UserDisplay = { name: '', photo: '' };

/**
 * Name and photo for a set of accounts, in ONE projected query.
 *
 * This is what replaced the `user_name` / `sender_name` / `updated_by_name`
 * columns that used to be copied onto every message, review and log row. Those
 * copies were written once and never updated, so a user who changed their name
 * or photo kept the old one forever in every chat they had ever posted in.
 *
 * Deliberately NOT `userService.me`, which fires a seven-collection
 * `Promise.all` per user — a 50-message chat page would run 350 queries. This
 * reads three fields and nothing else.
 *
 * There is no cache. A name resolved at read time is the whole point, and a TTL
 * would put the stale window straight back, just shorter.
 */
export async function userDisplayMap(ids: Iterable<string>): Promise<Map<string, UserDisplay>> {
  const unique = [...new Set([...ids].map(String).filter(Boolean))];
  const valid = unique.filter((id) => Types.ObjectId.isValid(id));
  const map = new Map<string, UserDisplay>();
  if (valid.length === 0) return map;

  const rows: any[] = await UserModel.find({ _id: { $in: valid } })
    .select('profile.first_name profile.last_name profile.profile_photo')
    .lean();

  for (const row of rows) {
    const profile = row.profile ?? {};
    map.set(String(row._id), {
      name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
      photo: profile.profile_photo ?? '',
    });
  }
  return map;
}

/** One account's display fields. Blank for a deleted or unknown id — a missing
 * user must render as an empty name, never break the row it belongs to. */
export async function userDisplayOf(id: string | null | undefined): Promise<UserDisplay> {
  if (!id) return BLANK;
  const map = await userDisplayMap([String(id)]);
  return map.get(String(id)) ?? BLANK;
}

/** Look a display up in a map built by {@link userDisplayMap}. */
export function displayFrom(map: Map<string, UserDisplay>, id: unknown): UserDisplay {
  return map.get(String(id ?? '')) ?? BLANK;
}
