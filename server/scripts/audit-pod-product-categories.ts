/**
 * READ-ONLY audit for the "restrict pod products to the pod category" change.
 *
 * That change makes the product gate fail CLOSED: a pod whose club carries no
 * Super + Sub pair now offers NO products in the picker, and the server refuses
 * to attach any. Before it shipped, such a pod offered the entire catalogue.
 *
 * So the blast radius is exactly:
 *   1. Clubs with a null/absent `super_category_id` or `category_id` (a club's
 *      Sub lives in `category_id`). Pods on these clubs can no longer attach
 *      products, and an EXISTING pod that already has product_requests will have
 *      its next update/resubmit refused until the club is categorised.
 *   2. Products with no category data at all (empty `categories` AND null flat
 *      ids). These already matched nothing, so they are invisible in every
 *      picker — worth surfacing while we are here.
 *
 * Run this against staging and production BEFORE deploying the fail-closed
 * change. If (1) is non-zero, categorise those clubs in Admin > Clubs first,
 * then re-run until it reports zero.
 *
 * This script WRITES NOTHING. It only counts and lists.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register scripts/audit-pod-product-categories.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { ClubModel } from '../src/modules/clubs/club/club.model';
import { PodModel } from '../src/modules/pods/pod/pod.model';
import { InventoryProductModel } from '../src/modules/venues/inventory/inventory.model';

const log = (...m: unknown[]) => console.log('[audit-pod-product-categories]', ...m);

/** A club can only gate products when it carries BOTH halves of the pair. */
const MISSING_CATEGORY = {
  $or: [
    { super_category_id: null },
    { super_category_id: { $exists: false } },
    { category_id: null },
    { category_id: { $exists: false } },
  ],
};

/** Neither a category row nor the flat legacy pair — matches no pod, ever. */
const UNCATEGORISED_PRODUCT = {
  $and: [
    { $or: [{ categories: { $size: 0 } }, { categories: { $exists: false } }] },
    { $or: [{ super_category_id: null }, { sub_category_id: null }] },
  ],
};

async function auditClubs() {
  const total = await ClubModel.countDocuments({});
  const clubs = await ClubModel.find(MISSING_CATEGORY)
    .select('club_name super_category_id category_id is_active')
    .lean();
  log(`clubs: ${clubs.length} of ${total} carry no complete Super + Sub pair`);
  for (const club of clubs) {
    log(
      `  - ${String(club._id)} "${club.club_name}"`,
      `super=${club.super_category_id ? 'set' : 'MISSING'}`,
      `sub=${club.category_id ? 'set' : 'MISSING'}`,
      `active=${club.is_active !== false}`,
    );
  }
  return clubs.map((club) => club._id);
}

/** Pods already carrying products on one of those clubs — the ones whose next
 * edit would be refused. This is the number that decides whether we backfill
 * before deploying or can ship straight away. */
async function auditAffectedPods(clubIds: mongoose.Types.ObjectId[]) {
  if (clubIds.length === 0) {
    log('pods at risk: 0 (no category-less clubs)');
    return 0;
  }
  const pods = await PodModel.find({
    club_id: { $in: clubIds },
    'product_requests.0': { $exists: true },
  })
    .select('pod_title club_id product_requests')
    .lean();
  log(`pods at risk: ${pods.length} already have products attached via a category-less club`);
  for (const pod of pods) {
    log(`  - ${String(pod._id)} "${pod.pod_title}" (${pod.product_requests?.length ?? 0} product rows)`);
  }
  return pods.length;
}

async function auditProducts() {
  const total = await InventoryProductModel.countDocuments({});
  const count = await InventoryProductModel.countDocuments(UNCATEGORISED_PRODUCT);
  log(`products: ${count} of ${total} carry no category data (invisible in every picker)`);
  return count;
}

async function main() {
  await connectDB();
  log(`database: ${mongoose.connection.name}`);
  const clubIds = await auditClubs();
  const podsAtRisk = await auditAffectedPods(clubIds);
  await auditProducts();
  log('---');
  if (clubIds.length === 0) {
    log('SAFE TO DEPLOY: every club carries a category, so nothing changes for anyone.');
  } else {
    log(
      `ACTION NEEDED: categorise ${clubIds.length} club(s) in Admin > Clubs before deploying.`,
      podsAtRisk > 0 ? `${podsAtRisk} existing pod(s) would fail their next edit.` : '',
    );
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('[audit-pod-product-categories] failed', e);
  process.exit(1);
});
