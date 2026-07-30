/**
 * Backfill `Host.host_categories` from approved Host Onboarding Meetings.
 *
 * Until the fix that seeds the meeting survey's Super → Category → Sub onto the
 * drafted host, `createDraftFromApproval` silently dropped the triple — so every
 * host onboarded through the meeting flow has `host_categories: []` and
 * Create-a-Pod shows "Assigned after host onboarding" instead of their category.
 * The triple still lives on their APPROVED meeting rows; this copies it over.
 *
 * For each host with EMPTY host_categories:
 *   1. Find their latest APPROVED HOST meeting carrying a full triple.
 *   2. Re-validate the triple against the Category collection (ids exist,
 *      levels match, parent chain lines up) — skip and log rows that fail.
 *   3. Push { triple, denormalized names, request_no: meeting.request_no }.
 *
 * Idempotent: hosts that already have any category are never touched, so a
 * re-run (or running after the code fix is live) changes nothing.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-host-categories-from-meetings.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-host-categories-from-meetings.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { HostModel } from '../src/modules/venues/host/host.model';
import { MeetingModel } from '../src/modules/survey/meeting.model';
import { CategoryModel } from '../src/modules/pods/category/category.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[backfill-host-categories]', ...m);

/** The meeting triple, validated the same way normalizeHostCategoryInput does. */
async function validateTriple(meeting: {
  super_category_id?: mongoose.Types.ObjectId | null;
  category_id?: mongoose.Types.ObjectId | null;
  sub_category_id?: mongoose.Types.ObjectId | null;
}) {
  const [superCat, category, subCat] = await Promise.all([
    CategoryModel.findById(meeting.super_category_id),
    CategoryModel.findById(meeting.category_id),
    CategoryModel.findById(meeting.sub_category_id),
  ]);
  if (superCat?.level !== 'SUPER') return null;
  if (category?.level !== 'CATEGORY' || String(category.parent_id) !== String(superCat._id)) return null;
  if (subCat?.level !== 'SUB' || String(subCat.parent_id) !== String(category._id)) return null;
  return {
    super_category_id: superCat._id,
    category_id: category._id,
    sub_category_id: subCat._id,
    super_category_name: superCat.name,
    category_name: category.name,
    sub_category_name: subCat.name,
  };
}

async function main() {
  await connectDB();
  log(`database: ${mongoose.connection.name}${dryRun ? ' (DRY RUN — writing nothing)' : ''}`);

  const hosts = await HostModel.find({
    $or: [{ host_categories: { $size: 0 } }, { host_categories: { $exists: false } }],
  });
  log(`hosts with no categories: ${hosts.length}`);

  let backfilled = 0;
  let noMeeting = 0;
  let invalid = 0;
  for (const host of hosts) {
    const meeting = await MeetingModel.findOne({
      user_id: host.user_id,
      kind: 'HOST',
      approval_status: 'APPROVED',
      super_category_id: { $ne: null },
      category_id: { $ne: null },
      sub_category_id: { $ne: null },
    }).sort({ created_at: -1 });
    if (!meeting) {
      noMeeting += 1;
      continue;
    }
    const normalized = await validateTriple(meeting);
    if (!normalized) {
      invalid += 1;
      log(`  SKIP (triple no longer validates): host=${String(host._id)} meeting=${meeting.request_no}`);
      continue;
    }
    log(
      `  ${dryRun ? 'WOULD backfill' : 'backfilling'}: host=${String(host._id)} "${host.full_name}"`,
      `→ ${normalized.super_category_name} › ${normalized.category_name} › ${normalized.sub_category_name}`,
      `(${meeting.request_no})`
    );
    if (!dryRun) {
      host.host_categories.push({ ...normalized, request_no: meeting.request_no ?? '' } as never);
      await host.save();
    }
    backfilled += 1;
  }

  log('---');
  log(`${dryRun ? 'would backfill' : 'backfilled'}: ${backfilled}, no approved meeting with a triple: ${noMeeting}, invalid triple: ${invalid}`);
  await mongoose.disconnect();
  log('done.');
}

main().catch((e) => {
  console.error('[backfill-host-categories] failed', e);
  process.exit(1);
});
