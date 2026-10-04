import { Types } from 'mongoose';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { openPodShopOrderFilter } from '@modules/commerce/productOrder/productOrder.cancel';
import { podShopReturnService } from '@modules/commerce/podShopReturn/podShopReturn.service';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import type { DeletionKind } from './catalogDeletion.model';

/**
 * What deleting a brand or product would touch, right now: the orders still
 * running on it, the returns still open, and (for a brand) the products that
 * go with it. The partner's warning, the Products team's review and the
 * scheduled run all read this one answer, so none of them can disagree.
 */

/** How many running orders the warning lists one by one; the count is always exact. */
const LISTED_ORDERS = 50;

export interface DeletionTarget {
  kind: DeletionKind;
  brandId: Types.ObjectId;
  productId?: Types.ObjectId | null;
}

/** A brand's products still on its books (not already deleted). */
export function liveBrandProducts(brandId: Types.ObjectId) {
  return InventoryProductModel.find({ brand_id: brandId, ownership: 'BRAND', status: { $ne: 'ARCHIVED' } })
    .select('_id product_name is_active')
    .lean();
}

/** The order filter for a target: lines of this product, or of any product of this brand. */
export function targetOrderFilter(target: DeletionTarget) {
  return target.kind === 'PRODUCT'
    ? openPodShopOrderFilter({ 'line_items.product_id': target.productId })
    : openPodShopOrderFilter({ 'line_items.brand_id': target.brandId });
}

export async function countOpenWork(target: DeletionTarget) {
  const [orders, returns] = await Promise.all([
    ProductOrderModel.countDocuments(targetOrderFilter(target)),
    target.kind === 'PRODUCT'
      ? podShopReturnService.countOpen({ productIds: [target.productId as Types.ObjectId] })
      : podShopReturnService.countOpen({ brandId: target.brandId }),
  ]);
  return { orders, returns };
}

export async function deletionImpact(target: DeletionTarget) {
  const [counts, orders, products] = await Promise.all([
    countOpenWork(target),
    ProductOrderModel.find(targetOrderFilter(target))
      .select('order_no fulfilment_status fulfilment_method created_at total currency_symbol line_items.product_id line_items.brand_id line_items.qty')
      .sort({ created_at: 1 })
      .limit(LISTED_ORDERS),
    target.kind === 'BRAND' ? liveBrandProducts(target.brandId) : Promise.resolve([]),
  ]);
  const ours = (line: { product_id: unknown; brand_id?: unknown }) =>
    target.kind === 'PRODUCT'
      ? String(line.product_id) === String(target.productId)
      : String(line.brand_id) === String(target.brandId);
  return {
    open_orders: counts.orders,
    open_returns: counts.returns,
    orders: orders.map((o) => ({
      id: String(o._id),
      order_no: o.order_no,
      fulfilment_status: o.fulfilment_status,
      fulfilment_method: o.fulfilment_method,
      created_at: o.created_at?.toISOString?.() ?? '',
      total: o.total,
      currency_symbol: o.currency_symbol,
      // Units of the item being deleted — what the partner owes or will refund.
      units: (o.line_items ?? []).filter(ours).reduce((s, l) => s + (l.qty ?? 0), 0),
    })),
    products: products.map((p) => ({ id: String(p._id), product_name: p.product_name, is_active: p.is_active !== false })),
  };
}
