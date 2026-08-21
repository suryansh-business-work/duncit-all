/**
 * Attribute EXISTING withdrawals to the pods whose earnings funded them.
 *
 *   npm run backfill:withdrawal-allocations:dry     # report only
 *   npm run backfill:withdrawal-allocations         # write the allocations
 *
 * Why this exists. A withdrawal is one debit against a fungible wallet balance,
 * so until now nothing recorded WHICH pod's money went out. Finance's
 * Withdrawal Payments page is now grouped by pod, and every withdrawal raised
 * from here on is attributed at request time — but every historical one has an
 * empty `allocations` array and would simply be missing from that page.
 *
 * This replays each withdrawer's ledger with the SAME oldest-first rule the
 * live path uses (allocateWithdrawal, imported rather than re-implemented, so
 * the backfill and the request path can never drift), and stamps the result.
 *
 * It moves NO money. It writes one field on withdrawals that have none, and
 * changes no status, no balance and no transaction.
 *
 * Idempotent: a withdrawal that already carries allocations is left untouched,
 * and its slices still count against what remains for the others, so a re-run
 * — or a run that died half way — converges on the same answer.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectForMigration } from './lib/migration-db';
import {
  allocateWithdrawal,
  consumedByRelease,
  type PodCredit,
} from '@modules/finance/wallet/withdrawal-allocation';

const DRY = process.argv.includes('--dry-run');

/** Rejected withdrawals never hold an attribution — the money went back. */
const ATTRIBUTABLE = ['PENDING', 'PAID'];

interface Plan {
  withdrawal_id: string;
  beneficiary: string;
  amount: number;
  allocations: ReturnType<typeof allocateWithdrawal>;
}

/**
 * The pod credits one user earned, oldest first.
 *
 * Titles and payout legs come from the releases the credits name. A credit
 * whose release no longer resolves still counts — losing the title is better
 * than dropping that money out of the attribution entirely.
 */
async function creditsFor(db: any, userId: any): Promise<PodCredit[]> {
  const credits = await db
    .collection('wallettransactions')
    .find({ user_id: userId, type: 'CREDIT', source: 'POD_COMPLETION', pod_id: { $ne: null } })
    .sort({ created_at: 1 })
    .toArray();
  if (credits.length === 0) return [];

  const releaseIds = credits.map((c: any) => c.release_id).filter(Boolean);
  const releases = releaseIds.length
    ? await db
        .collection('paymentreleases')
        .find({ release_id: { $in: releaseIds } })
        .project({ release_id: 1, kind: 1, pod_title: 1 })
        .toArray()
    : [];
  const byRelease = new Map(releases.map((r: any) => [String(r.release_id), r]));

  return credits.map((c: any) => {
    const release: any = byRelease.get(String(c.release_id ?? ''));
    return {
      pod_id: String(c.pod_id),
      pod_title: release?.pod_title ?? '',
      release_id: String(c.release_id ?? ''),
      kind: release?.kind ?? 'HOST_PAYMENT',
      amount: Number(c.amount) || 0,
    };
  });
}

/**
 * Plan one user's withdrawals, oldest request first.
 *
 * Order matters: the earliest withdrawal draws the earliest earnings, so
 * replaying them in request order reproduces exactly what the live path would
 * have written had it existed at the time. Already-attributed withdrawals are
 * not re-planned, but their slices are seeded into the consumed tally so the
 * unattributed ones cannot claim the same money twice.
 */
async function planForUser(db: any, userId: any): Promise<Plan[]> {
  const withdrawals = await db
    .collection('walletwithdrawals')
    .find({ user_id: userId, status: { $in: ATTRIBUTABLE } })
    .sort({ requested_at: 1, _id: 1 })
    .toArray();
  if (withdrawals.length === 0) return [];

  const credits = await creditsFor(db, userId);
  if (credits.length === 0) return [];

  const consumed = consumedByRelease(withdrawals.filter((w: any) => w.allocations?.length));

  const plans: Plan[] = [];
  for (const w of withdrawals) {
    if (w.allocations?.length) continue;
    const allocations = allocateWithdrawal(credits, consumed, Number(w.amount) || 0);
    if (allocations.length === 0) continue;
    for (const a of allocations) {
      consumed.set(a.release_id, (consumed.get(a.release_id) ?? 0) + a.amount);
    }
    plans.push({
      withdrawal_id: w.withdrawal_id,
      beneficiary: w.beneficiary_name || w.beneficiary_email || String(w.user_id),
      amount: Number(w.amount) || 0,
      allocations,
    });
  }
  return plans;
}

async function write(db: any, plans: Plan[]): Promise<number> {
  let written = 0;
  for (const plan of plans) {
    const allocations = plan.allocations.map((a) => ({
      pod_id: new mongoose.Types.ObjectId(a.pod_id),
      pod_title: a.pod_title,
      release_id: a.release_id,
      kind: a.kind,
      amount: a.amount,
    }));
    // The empty-allocations filter is the idempotency guard: a re-run cannot
    // overwrite an attribution that is already there.
    const res = await db
      .collection('walletwithdrawals')
      .updateOne(
        { withdrawal_id: plan.withdrawal_id, $or: [{ allocations: { $size: 0 } }, { allocations: { $exists: false } }] },
        { $set: { allocations } }
      );
    written += res.modifiedCount;
  }
  return written;
}

async function main() {
  const db = await connectForMigration({ dry: DRY });

  const userIds: any[] = await db
    .collection('walletwithdrawals')
    .distinct('user_id', { status: { $in: ATTRIBUTABLE } });

  const plans: Plan[] = [];
  for (const userId of userIds) {
    plans.push(...(await planForUser(db, userId)));
  }

  const total = await db
    .collection('walletwithdrawals')
    .countDocuments({ status: { $in: ATTRIBUTABLE } });

  console.log(`withdrawers                 : ${userIds.length}`);
  console.log(`attributable withdrawals    : ${total}`);
  console.log(`can be attributed to a pod  : ${plans.length}\n`);

  for (const plan of plans) {
    const pods = plan.allocations
      .map((a) => `${a.pod_title || a.pod_id} ${a.amount.toFixed(2)} (${a.kind})`)
      .join(', ');
    console.log(`  ${plan.withdrawal_id}  ${plan.beneficiary}  ${plan.amount.toFixed(2)} -> ${pods}`);
  }

  if (!DRY && plans.length > 0) {
    const written = await write(db, plans);
    console.log(`\nAttributed ${written} of ${plans.length}.`);
  }

  console.log(
    `\n${DRY ? 'DRY RUN — nothing written.' : 'Done.'} No money moved: this writes the allocations field only.`
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
