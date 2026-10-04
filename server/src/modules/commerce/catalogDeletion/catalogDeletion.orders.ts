import { logs } from '@observability/log';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { cancelPodShopOrder } from '@modules/commerce/productOrder/productOrder.cancel';
import { CatalogDeletionRequestModel, type ICatalogDeletionRequest } from './catalogDeletion.model';
import { targetOrderFilter } from './catalogDeletion.impact';

/**
 * CANCEL_AND_REFUND: cancel every running order made up ONLY of what is being
 * deleted, with a full refund and an apology to each buyer.
 *
 * An order that also carries something else (another product of the brand on
 * a product request, or another brand's goods on a pickup order) is left
 * running: cancelling it would cancel a sale nobody asked to stop. Those keep
 * the deletion waiting, are listed to the Products team, and can be
 * force-cancelled from the order page if that is what is wanted.
 *
 * Safe to run again (the executor re-runs it after a restart): each cancel
 * claims an order only while it is still open.
 */
export async function cancelRunningOrders(req: ICatalogDeletionRequest, by: string, quiet = false) {
  const target = { kind: req.kind, brandId: req.brand_id, productId: req.product_id };
  const orders = await ProductOrderModel.find(targetOrderFilter(target)).select('_id order_no line_items.product_id line_items.brand_id');
  const ours = (line: { product_id: unknown; brand_id?: unknown }) =>
    req.kind === 'PRODUCT' ? String(line.product_id) === String(req.product_id) : String(line.brand_id) === String(req.brand_id);
  const item = req.kind === 'BRAND' ? req.brand_name : req.product_name;
  let cancelled = 0;
  let failedRefunds = 0;
  let mixed = 0;
  for (const order of orders) {
    if (!order.line_items.every(ours)) {
      mixed += 1;
      continue;
    }
    try {
      const done = await cancelPodShopOrder(String(order._id), {
        source: 'DELETION',
        actor: by,
        reason: `${item} is no longer sold on Duncit`,
      });
      cancelled += 1;
      if (done.refund.status === 'FAILED') failedRefunds += 1;
    } catch (error) {
      logs.server.warn('catalogDeletion', 'cancelOrder', { error, order_no: order.order_no, request_no: req.request_no });
    }
  }
  // The executor's re-run writes nothing when there was nothing left to cancel.
  if (quiet && cancelled === 0) return { cancelled, failedRefunds, mixed };
  const parts = [`Cancelled ${cancelled} order(s) with a full refund`];
  if (failedRefunds) parts.push(`${failedRefunds} refund(s) refused by Razorpay — Finance pays them out`);
  if (mixed) parts.push(`${mixed} order(s) also carry other items and were left running`);
  const note = parts.join('; ');
  await CatalogDeletionRequestModel.updateOne(
    { _id: req._id },
    {
      $inc: { cancelled_orders: cancelled, failed_refunds: failedRefunds },
      $push: { events: { action: 'ORDERS_CANCELLED', note, by, at: new Date() } },
    }
  );
  logs.server.info('catalogDeletion', 'cancelRunningOrders', { request_no: req.request_no, cancelled, failedRefunds, mixed });
  return { cancelled, failedRefunds, mixed };
}
