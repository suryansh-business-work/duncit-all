/**
 * Backfill InventoryProduct.ownership + clean up junk product data (item 4/5).
 *
 * 1. Backfill `ownership` on products created before the field existed:
 *    brand_id set OR a partner submitted the listing  → 'BRAND', else 'DUNCIT'.
 * 2. Delete clearly-junk products (owner-authorised), GUARDED so a product that
 *    was ever sold (referenced by a ProductOrder line) is never removed:
 *      - name matches /test|demo|sample|dummy/i, OR
 *      - ownership 'BRAND' with a null brand_id (can't belong to any brand).
 *    Deleting cascades: pull the product from Pod.product_requests and recompute
 *    products_enabled + product_cost_total, then hard-delete the product.
 * 3. Seed a default Duncit pickup/warehouse (BrandPickupLocation) if none exists,
 *    so Duncit-owned SHIP orders have a pickup source (operator completes the
 *    address + registers it with ShipRocket from the Products portal).
 *
 * Idempotent; safe to re-run. Run against the shared prod Mongo with --dry-run
 * FIRST, review the counts, then run for real.
 *
 * Run:
 *   npm run migrate:product-ownership:dry
 *   npm run migrate:product-ownership
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { InventoryProductModel } from '../src/modules/venues/inventory/inventory.model';
import { PodModel } from '../src/modules/pods/pod/pod.model';
import { BrandPickupLocationModel } from '../src/modules/venues/brandPickupLocation/brandPickupLocation.model';
import { ProductOrderModel } from '../src/modules/commerce/productOrder/productOrder.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[migrate-product-ownership]', ...m);
const round2 = (n: number) => Math.round(n * 100) / 100;
const JUNK_NAME = /test|demo|sample|dummy/i;

async function backfillOwnership(): Promise<void> {
  const missing = await InventoryProductModel.find({ ownership: { $exists: false } }).select(
    '_id brand_id listing_submitted_by_id'
  );
  let brand = 0;
  let duncit = 0;
  for (const p of missing) {
    const submittedBy = String((p as any).listing_submitted_by_id ?? '').trim();
    const isBrand = !!(p as any).brand_id || submittedBy.length > 0;
    if (isBrand) brand += 1;
    else duncit += 1;
    if (!dryRun) {
      await InventoryProductModel.updateOne({ _id: p._id }, { $set: { ownership: isBrand ? 'BRAND' : 'DUNCIT' } });
    }
  }
  log(`backfill ownership: ${missing.length} products (BRAND=${brand}, DUNCIT=${duncit})`);
}

async function soldProductIds(): Promise<Set<string>> {
  const orders = await ProductOrderModel.find({}).select('line_items.product_id');
  const set = new Set<string>();
  for (const o of orders) {
    for (const li of o.line_items) set.add(String(li.product_id));
  }
  return set;
}

async function cascadeRemoveFromPods(productId: mongoose.Types.ObjectId): Promise<void> {
  const pods = await PodModel.find({ 'product_requests.product_id': productId });
  for (const pod of pods) {
    const kept = (pod.product_requests as any[]).filter((r) => String(r.product_id) !== String(productId));
    (pod as any).product_requests = kept;
    pod.product_cost_total = round2(kept.reduce((s, r) => s + Number(r.total_cost || 0), 0));
    pod.products_enabled = kept.length > 0;
    await pod.save();
  }
}

async function deleteJunk(): Promise<void> {
  const sold = await soldProductIds();
  const all = await InventoryProductModel.find({}).select('_id product_name ownership brand_id');
  const junk = all.filter((p) => {
    if (sold.has(String(p._id))) return false;
    const nameJunk = JUNK_NAME.test(p.product_name || '');
    const brandOrphan = p.ownership === 'BRAND' && !p.brand_id;
    return nameJunk || brandOrphan;
  });
  log(`junk candidates: ${junk.length}${dryRun ? ' (dry-run, not deleting)' : ''}`);
  for (const p of junk) {
    log(`  delete ${p._id} "${p.product_name}" (${p.ownership})`);
    if (dryRun) continue;
    await cascadeRemoveFromPods(p._id as mongoose.Types.ObjectId);
    await InventoryProductModel.deleteOne({ _id: p._id });
  }
}

async function seedDuncitWarehouse(): Promise<void> {
  const exists = await BrandPickupLocationModel.findOne({ owner_kind: 'DUNCIT' });
  if (exists) {
    log('Duncit warehouse already exists — skipping seed');
    return;
  }
  log('seeding default Duncit warehouse (is_default, unregistered — complete it in the Products portal)');
  if (!dryRun) {
    await BrandPickupLocationModel.create({
      owner_kind: 'DUNCIT',
      nickname: 'Duncit Primary',
      is_default: true,
      shiprocket_registered: false,
    });
  }
}

async function main(): Promise<void> {
  await connectDB();
  log(dryRun ? 'DRY RUN — no writes' : 'LIVE — writing changes');
  await backfillOwnership();
  await deleteJunk();
  await seedDuncitWarehouse();
  await mongoose.disconnect();
  log('done');
}

main().catch((e) => {
  console.error('[migrate-product-ownership] failed', e);
  process.exit(1);
});
