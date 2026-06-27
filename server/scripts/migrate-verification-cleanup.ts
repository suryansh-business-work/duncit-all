/**
 * Clean up UserVerification rows after the B22 verification redesign.
 *
 * What changed (see verification.model.ts):
 *  - VERIFICATION_TYPES narrowed from 7 to ['IDENTITY','ADDRESS','EMAIL'].
 *    PHONE / BANK_ACCOUNT / POLICE / SELFIE were dropped.
 *  - ADDRESS no longer uses a document upload; it stores an embedded `address`
 *    sub-doc. Legacy ADDRESS rows that only have a `document_url` (and no
 *    `address`) are stale and removed so users re-submit the structured form.
 *
 * This script (best-effort, idempotent, safe to re-run):
 *  1. Deletes rows whose `type` is one of the dropped kinds.
 *  2. Deletes old ADDRESS rows that have a `document_url` but no `address`.
 *
 * Per shared-dev-prod-db: local `dev` MONGO_URI points at production Mongo.
 * ALWAYS dry-run first and confirm the counts before a WRITE run.
 *
 * Run:
 *   npm run migrate:verification-cleanup -- --dry-run   # or migrate:verification-cleanup:dry
 *   npm run migrate:verification-cleanup
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { UserVerificationModel } from '../src/modules/access/verification/verification.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-verification-cleanup]', ...m);

const DROPPED_TYPES = ['PHONE', 'BANK_ACCOUNT', 'POLICE', 'SELFIE'];

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  const col = UserVerificationModel.collection;

  // 1) Rows of dropped types.
  const droppedFilter = { type: { $in: DROPPED_TYPES } };
  const droppedCount = await col.countDocuments(droppedFilter);
  log(`dropped-type rows (${DROPPED_TYPES.join('/')}): ${droppedCount}`);

  // 2) Legacy doc-based ADDRESS rows (have document_url, missing address sub-doc).
  const staleAddressFilter = {
    type: 'ADDRESS',
    document_url: { $nin: [null, undefined, ''] },
    address: { $in: [null, undefined] },
  };
  const staleAddressCount = await col.countDocuments(staleAddressFilter);
  log(`stale doc-based ADDRESS rows: ${staleAddressCount}`);

  if (dryRun) {
    log('dry-run: no deletes performed.');
  } else {
    const d1 = await col.deleteMany(droppedFilter).catch((e) => {
      log(`  (skip dropped) ${(e as Error).message}`);
      return { deletedCount: 0 };
    });
    const d2 = await col.deleteMany(staleAddressFilter).catch((e) => {
      log(`  (skip stale address) ${(e as Error).message}`);
      return { deletedCount: 0 };
    });
    log(`deleted dropped-type rows: ${d1.deletedCount ?? 0}`);
    log(`deleted stale ADDRESS rows: ${d2.deletedCount ?? 0}`);
  }

  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-verification-cleanup] failed', e);
  process.exit(1);
});
