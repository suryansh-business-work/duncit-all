/**
 * Migrate the ProductOrder idempotency index for the split-checkout batch.
 *
 * A unified product cart can now span multiple pods and multiple warehouses, so
 * one payment can yield several SHIP orders. The old unique index
 * `{ payment_id, fulfilment_method }` would collide on that; the new key is
 * `{ payment_id, pod_id, fulfilment_method, pickup_location_id }`.
 *
 * This drops the stale 2-field unique index (Mongoose never drops a changed
 * index on its own) and rebuilds the current indexes via `syncIndexes()`.
 * Existing rows keep one pod_id + one pickup_location_id each, so they stay
 * unique under the new key — no data rewrite. Idempotent; safe to re-run.
 *
 * Run:
 *   npx ts-node scripts/reindex-product-orders.ts
 *   npx ts-node scripts/reindex-product-orders.ts --dry-run
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { ProductOrderModel } from '../src/modules/commerce/productOrder/productOrder.model';

const dryRun = process.argv.includes('--dry-run');
const log = (...m: unknown[]) => console.log('[reindex-product-orders]', ...m);

const STALE_INDEX = 'payment_id_1_fulfilment_method_1';

async function run() {
  await connectDB();
  const collection = ProductOrderModel.collection;
  const existing = await collection.indexes();
  log(`mode: ${dryRun ? 'DRY-RUN' : 'WRITE'} — ${existing.length} indexes on "productorders"`);

  const hasStale = existing.some((index) => index.name === STALE_INDEX);
  if (hasStale && !dryRun) {
    await collection.dropIndex(STALE_INDEX);
    log('dropped stale unique index', STALE_INDEX);
  } else {
    log(hasStale ? 'dry-run: would drop' : 'stale index absent —', STALE_INDEX);
  }

  if (dryRun) {
    log('dry-run: skipping syncIndexes()');
  } else {
    const dropped = await ProductOrderModel.syncIndexes();
    log('syncIndexes() complete. Dropped by sync:', dropped);
  }

  await mongoose.disconnect();
  log('done.');
}

run().catch((e) => {
  console.error('[reindex-product-orders] failed', e);
  process.exit(1);
});
