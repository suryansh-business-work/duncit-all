/**
 * Give EXISTING withdrawals the approval and payout fields Finance now filters on.
 *
 *   npm run backfill:withdrawal-approvals:dry     # report only
 *   npm run backfill:withdrawal-approvals         # write them
 *
 * Why this exists. A withdrawal now carries a decision (`approval_status`) and a
 * payout state (`payout.status`) apart from the legacy `status`, and the
 * Withdrawal Payments table filters on them. Every historical row has neither,
 * so a filter for "Paid" or "Pending" would silently skip all of last year.
 * Reads already derive the right answer for such a row; this makes the stored
 * data agree so the FILTERS do too.
 *
 *   PENDING  -> approval PENDING
 *   REJECTED -> approval REJECTED, the old reject_reason becomes the decision reason
 *   PAID     -> approval APPROVED, approved_amount = amount, payout PAID (paid by hand —
 *               no Razorpay ids, because there were none)
 *
 * It moves NO money and changes no balance, ledger row or legacy status. Only
 * rows that have no `approval_status` are touched, so a re-run (or one that died
 * half way) converges, and a row decided through the new flow is never rewritten.
 */
import 'dotenv/config';
import { connectForMigration } from './lib/migration-db';

const DRY = process.argv.includes('--dry-run');

const NO_APPROVAL = { approval_status: { $exists: false } };

async function main() {
  const db = await connectForMigration({ dry: DRY });
  const rows = db.collection('walletwithdrawals');

  const counts = {
    pending: await rows.countDocuments({ ...NO_APPROVAL, status: 'PENDING' }),
    rejected: await rows.countDocuments({ ...NO_APPROVAL, status: 'REJECTED' }),
    paid: await rows.countDocuments({ ...NO_APPROVAL, status: 'PAID' }),
  };
  console.log(`pending  -> PENDING  : ${counts.pending}`);
  console.log(`rejected -> REJECTED : ${counts.rejected}`);
  console.log(`paid     -> APPROVED + PAID (by hand) : ${counts.paid}`);
  if (DRY) {
    console.log('\nDry run: nothing written.');
    process.exit(0);
  }

  const pending = await rows.updateMany({ ...NO_APPROVAL, status: 'PENDING' }, { $set: { approval_status: 'PENDING' } });
  const rejected = await rows.updateMany({ ...NO_APPROVAL, status: 'REJECTED' }, [
    { $set: { approval_status: 'REJECTED', decision_reason: { $ifNull: ['$reject_reason', ''] } } },
  ]);
  const paid = await rows.updateMany({ ...NO_APPROVAL, status: 'PAID' }, [
    {
      $set: {
        approval_status: 'APPROVED',
        approved_amount: '$amount',
        payout: {
          status: 'PAID',
          attempt: 1,
          razorpay_contact_id: '',
          razorpay_fund_account_id: '',
          razorpay_payout_id: '',
          utr: '',
          failure_reason: '',
          idempotency_key: '',
          initiated_by: { $ifNull: ['$reviewed_by', null] },
          initiated_at: { $ifNull: ['$reviewed_at', null] },
          completed_at: { $ifNull: ['$paid_at', null] },
        },
      },
    },
  ]);
  console.log(`\nUpdated ${pending.modifiedCount + rejected.modifiedCount + paid.modifiedCount} withdrawals.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
