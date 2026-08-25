import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { DELETED_USER_NAME } from '@modules/access/accountDeletion/accountDeletion.retention';

/**
 * The two things every admin ledger table needs and none of them should own.
 *
 * The coin ledger and the gift card tables each carried a byte-identical copy
 * of both, which is exactly the drift rule 40 exists to stop: a fix to how a
 * name is read, or to which month a column starts at, lands in one table and
 * quietly not the other. Server-side duplication consolidates HERE rather than
 * into a `@duncit/*` package — `server/src` imports none of them by design.
 */

/** A person as a ledger row shows them: a name and an email, nothing else. */
export interface UserInfo {
  name: string;
  email: string;
}

/**
 * Names for ledger rows that carry no frozen snapshot to take them from —
 * referral credits, manual adjustments, gift card purchasers — plus the admins
 * who typed the manual ones. Without it a growing share of the ledger renders a
 * blank where a person should be, which is the column an audit reads first.
 *
 * Ids are validated before the query rather than after: a malformed id thrown
 * at `$in` casts and rejects the whole page, so one bad row would blank the
 * names on every good one beside it.
 */
export async function loadUserMap(userIds: string[]): Promise<Map<string, UserInfo>> {
  const unique = [...new Set(userIds.filter(Boolean))].filter((id) => Types.ObjectId.isValid(id));
  if (unique.length === 0) return new Map();
  const rows = await UserModel.find({ _id: { $in: unique } })
    .select('email profile.first_name profile.last_name')
    .lean();
  return new Map(
    rows.map((u: any) => [
      String(u._id),
      {
        name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
        email: u.email ?? '',
      },
    ])
  );
}

/**
 * The name to show for a row that points at an account which may be gone.
 *
 * A record retained through an account deletion keeps its `user_id`, and the
 * ones with no frozen name beside it resolve the name by loading the account —
 * which after a purge finds nothing. A blank there reads as a broken table
 * rather than as a person who left.
 *
 * The blank is kept for a row that names NOBODY: an unattributed ledger entry
 * is not a deleted user.
 */
export function userNameOrDeleted(
  account: UserInfo | null | undefined,
  referenceId: unknown
): string {
  if (account) return account.name ?? '';
  return referenceId ? DELETED_USER_NAME : '';
}

/** UTC 'YYYY-MM' keys for the last `span` months, oldest first — the x-axis
 * every month-distribution chart in the admin ledgers is drawn against. */
export function monthKeys(span: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let back = span - 1; back >= 0; back -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const mm = String(month.getUTCMonth() + 1).padStart(2, '0');
    keys.push(`${month.getUTCFullYear()}-${mm}`);
  }
  return keys;
}
