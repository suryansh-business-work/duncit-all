/**
 * Backfill the human-readable `ticket_no` reference on existing SOS alerts and
 * callback requests (Support → SOS Alerts / Callback Requests).
 *
 * What changed (see bouncer.model.ts):
 *  - `bouncersosalerts` + `bouncercallbackrequests` gained a `ticket_no` field
 *    (SOS-XXXXXX / CB-XXXXXX), stamped on create from the document id.
 *
 * This script stamps every pre-existing doc that has no `ticket_no` yet, using
 * the same id-derived formula as the runtime (`ticketNo(prefix, _id)`), so the
 * reference is identical to the one already shown in the unified ticket list.
 *
 * Idempotent (only touches docs with a missing/blank `ticket_no`); safe to
 * re-run.
 *
 * Run:
 *   npm run migrate:bouncer-ticket-no
 *   npm run migrate:bouncer-ticket-no -- --dry-run
 */
import 'dotenv/config';
import mongoose, { type Model, type Types } from 'mongoose';
import { connectDB } from '../src/config/db';
import {
  BouncerSosAlertModel,
  BouncerCallbackRequestModel,
} from '../src/modules/support/bouncer/bouncer.model';
import { ticketNo } from '../src/modules/support/supportChat/unifiedTickets.service';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-bouncer-ticket-no]', ...m);

/** Stamp ticket_no on every doc of a model that is missing one. */
async function backfill(model: Model<any>, prefix: string): Promise<number> {
  const pending = await model
    .find({ $or: [{ ticket_no: { $in: [null, ''] } }, { ticket_no: { $exists: false } }] })
    .select('_id')
    .lean();
  log(`${prefix}: docs needing ticket_no: ${pending.length}`);
  if (dryRun) return pending.length;
  for (const doc of pending) {
    const id = doc._id as Types.ObjectId;
    await model.updateOne({ _id: id }, { $set: { ticket_no: ticketNo(prefix, id) } });
  }
  return pending.length;
}

async function run() {
  await connectDB();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'}`);

  const sos = await backfill(BouncerSosAlertModel, 'SOS');
  const cb = await backfill(BouncerCallbackRequestModel, 'CB');
  log(`stamped SOS: ${sos}, callbacks: ${cb}`);

  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[migrate-bouncer-ticket-no] failed', e);
  process.exit(1);
});
