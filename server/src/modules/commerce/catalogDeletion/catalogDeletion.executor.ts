import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { ecommBrandService } from '@modules/venues/ecommBrand/ecommBrand.service';
import { CatalogDeletionRequestModel, type ICatalogDeletionRequest } from './catalogDeletion.model';
import { countOpenWork, liveBrandProducts } from './catalogDeletion.impact';
import { cancelRunningOrders } from './catalogDeletion.orders';
import { notifyDeletionUpdate } from './catalogDeletion.notify';

/**
 * Carries out approved deletion requests whose date has come — but only once
 * nothing is left running on them. Products first, then brands, so a brand
 * whose last product went this run can go in the same run.
 *
 * A request that has to wait says why (`blocked_reason`), so the Products team
 * and the partner see "2 orders, 1 return still open" rather than silence.
 */

const SYSTEM = 'Scheduler';

/** Take a product off the shop for good — the archive tombstone every shop query already honours. */
async function archiveProduct(productId: Types.ObjectId) {
  await InventoryProductModel.updateOne(
    { _id: productId },
    { $set: { status: 'ARCHIVED', is_active: false, pod_available: false, host_request_allowed: false } }
  );
}

async function complete(req: ICatalogDeletionRequest, note: string) {
  req.status = 'COMPLETED';
  req.open = false;
  req.completed_at = new Date();
  req.blocked_reason = '';
  req.events.push({ action: 'COMPLETED', note, by: SYSTEM, at: new Date() });
  await req.save();
  logs.server.info('catalogDeletion', 'complete', { request_no: req.request_no, kind: req.kind });
  // A product inside a brand request is reported with the brand, once.
  if (!req.parent_id) await notifyDeletionUpdate(req, 'completed — it has been deleted', note);
}

/** Record why it cannot run yet; the history only gains a line when the reason changes. */
async function block(req: ICatalogDeletionRequest, reason: string) {
  req.last_checked_at = new Date();
  if (req.blocked_reason !== reason) {
    req.blocked_reason = reason;
    req.events.push({ action: 'WAITING', note: reason, by: SYSTEM, at: new Date() });
  }
  await req.save();
}

const waitingFor = (orders: number, returns: number) => {
  const parts: string[] = [];
  if (orders) parts.push(`${orders} order(s) still running`);
  if (returns) parts.push(`${returns} return(s) still open`);
  return parts.join(', ');
};

async function runProduct(req: ICatalogDeletionRequest) {
  if (req.mode === 'CANCEL_AND_REFUND') await cancelRunningOrders(req, SYSTEM, true);
  const { orders, returns } = await countOpenWork({ kind: 'PRODUCT', brandId: req.brand_id, productId: req.product_id });
  if (orders || returns) return block(req, waitingFor(orders, returns));
  if (req.product_id) await archiveProduct(req.product_id);
  return complete(req, 'Every order on it is settled — the product is deleted');
}

async function runBrand(req: ICatalogDeletionRequest) {
  if (req.mode === 'CANCEL_AND_REFUND') await cancelRunningOrders(req, SYSTEM, true);
  const children = await CatalogDeletionRequestModel.countDocuments({ parent_id: req._id, open: true });
  if (children) return block(req, `${children} product(s) of the brand still waiting to be deleted`);
  const { orders, returns } = await countOpenWork({ kind: 'BRAND', brandId: req.brand_id });
  if (orders || returns) return block(req, waitingFor(orders, returns));
  // Anything listed after the request went in (the brand was hidden, so unsold) goes too.
  for (const p of await liveBrandProducts(req.brand_id)) await archiveProduct(p._id as Types.ObjectId);
  await ecommBrandService.removeForDeletionRequest(String(req.brand_id), req.review_note || req.reason);
  return complete(req, 'Every product and order is settled — the brand is deleted');
}

/** One sweep. Answers how many requests completed. */
export async function runDueDeletions(now = new Date()): Promise<number> {
  let completed = 0;
  for (const kind of ['PRODUCT', 'BRAND'] as const) {
    const due = await CatalogDeletionRequestModel.find({ kind, status: 'APPROVED', scheduled_for: { $lte: now } })
      .sort({ scheduled_for: 1 })
      .limit(200);
    for (const req of due) {
      try {
        await (kind === 'PRODUCT' ? runProduct(req) : runBrand(req));
        if (req.status === 'COMPLETED') completed += 1;
      } catch (error) {
        logs.server.error('catalogDeletion', 'runDueDeletions', { error, request_no: req.request_no });
      }
    }
  }
  return completed;
}
