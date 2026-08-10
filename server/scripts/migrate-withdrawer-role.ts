/**
 * Stamp `withdrawer_role` onto withdrawals raised before the field existed.
 *
 *   npm run migrate:withdrawer-role:dry     # report only
 *   npm run migrate:withdrawer-role         # write
 *   npm run migrate:withdrawer-role:local   # against a local restore
 *
 * Why this is not optional. The model gives `withdrawer_role` a mongoose
 * `default: 'HOST'` and `withdrawalPub` falls back to 'HOST', so an old row
 * RENDERS as Host — but the Role filter is a Mongo equality, and a document
 * where the field is physically absent matches nothing. Without this pass a
 * finance reviewer filtering Role = Host silently does not see the pending
 * legacy requests they are supposed to pay. A row that is invisible in the only
 * view built to action it is worse than one that is merely mislabelled.
 *
 * The role is resolved from the withdrawer's CURRENT roles, using the same
 * precedence as `resolveWithdrawerRole` in wallet.service.ts. That is a
 * best-effort reconstruction — the capacity someone withdrew in months ago is
 * not recoverable — so it only ever fills rows that have no value at all, and
 * never rewrites one the app stamped.
 *
 * Idempotent: a row that already has the field matches nothing on a re-run.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectForMigration } from './lib/migration-db';

const DRY = process.argv.includes('--dry-run');

/** Same order as resolveWithdrawerRole — most specific earning capacity first,
 * HOST last because nearly every earning partner also holds it. */
const PRECEDENCE = ['VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER', 'HOST'] as const;

async function main(): Promise<void> {
  const connection = await connectForMigration({ dry: DRY });
  const db = connection.db;
  if (!db) throw new Error('No database handle after connect');

  const withdrawals = db.collection('walletwithdrawals');
  const missing = await withdrawals
    .find({ withdrawer_role: { $exists: false } })
    .project({ _id: 1, user_id: 1 })
    .toArray();

  if (missing.length === 0) {
    console.log('Every withdrawal already carries a role. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // One read for every distinct withdrawer, not one per row.
  const userIds = [...new Set(missing.map((w) => String(w.user_id)))];
  const users = await db
    .collection('users')
    .find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } })
    .project({ _id: 1, 'metadata.role_keys': 1 })
    .toArray();

  const roleOf = new Map<string, string>();
  for (const u of users) {
    const held: string[] = (u as any).metadata?.role_keys ?? [];
    roleOf.set(String(u._id), PRECEDENCE.find((r) => held.includes(r)) ?? 'HOST');
  }

  const counts: Record<string, number> = {};
  const byRole = new Map<string, mongoose.Types.ObjectId[]>();
  for (const w of missing) {
    // A deleted account leaves no roles to read; HOST is the same value the
    // model's default and the read-side fallback already show for these rows.
    const role = roleOf.get(String(w.user_id)) ?? 'HOST';
    counts[role] = (counts[role] ?? 0) + 1;
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(w._id as mongoose.Types.ObjectId);
  }

  for (const [role, ids] of byRole) {
    console.log(`${role.padEnd(16)} ${String(ids.length).padStart(7)} withdrawals`);
    if (!DRY) {
      const res = await withdrawals.updateMany({ _id: { $in: ids } }, { $set: { withdrawer_role: role } });
      console.log(`  → stamped ${res.modifiedCount}`);
    }
  }

  console.log(
    `\n${DRY ? 'DRY RUN — nothing written.' : 'Done.'} ${missing.length} withdrawal(s) had no role.`
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
