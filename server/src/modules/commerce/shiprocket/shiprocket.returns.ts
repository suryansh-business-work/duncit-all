import { logs } from '@observability/log';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { StoreProductModel } from '@modules/commerce/store/storeProduct.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PACKAGING_LIMITS } from '@modules/venues/inventory/inventory.packaging';
import type { IStoreReturn, ReturnPickupStatus } from '@modules/commerce/store/storeReturn.model';
import { shiprocketError, type Json } from './shiprocket.client';
import { assignAwb, createReturnOrder, parseShiprocketDate, type TrackResult } from './shiprocket.gateway';
import { buildParcel, withWeights, type Parcel } from './shiprocket.parcel';

/**
 * The courier leg of a pet-store return: a reverse pickup from the buyer's
 * address to the warehouse the order shipped from.
 *
 * Booked when an operator approves the return; tracked by the same webhook
 * and sweep as forward shipments. When the parcel reaches the warehouse the
 * return is marked RECEIVED, so the operator can inspect, restock and refund.
 */

const today = () => new Date().toISOString().slice(0, 10);

/** The returned units as a parcel, from the dimensions the order snapshotted. */
function returnParcel(ret: IStoreReturn, order: IProductOrder): Parcel {
  const lines = ret.items.map((item) => {
    const src = order.line_items.find(
      (l) => String(l.product_id) === String(item.product_id) && (l.variant_id || '') === (item.variant_id || '')
    );
    return {
      qty: item.qty,
      weight_kg: src?.weight_kg ?? 0,
      length_cm: src?.length_cm ?? 0,
      breadth_cm: src?.breadth_cm ?? 0,
      height_cm: src?.height_cm ?? 0,
    };
  });
  const parcel = buildParcel(lines);
  if (parcel.weight_kg >= PACKAGING_LIMITS.minWeightKg && parcel.length_cm >= PACKAGING_LIMITS.minSideCm) return parcel;
  // Items without packaging: the order's own declared parcel is the honest upper bound.
  if (order.parcel) return withWeights(order.parcel);
  throw shiprocketError('Packaging is missing for these items — add it on the products, then book the pickup again');
}

async function returnPayload(ret: IStoreReturn, order: IProductOrder): Promise<Json> {
  const warehouse = await BrandPickupLocationModel.findOne({ nickname: order.pickup_location_id }).lean();
  if (!warehouse) throw shiprocketError(`There is no warehouse "${order.pickup_location_id}" to return this to`);
  const addr = (order.shipping_address ?? {}) as unknown as Record<string, string>;
  const [first = 'Customer', ...rest] = String(addr.name || order.buyer_name).trim().split(/\s+/);
  const parcel = returnParcel(ret, order);
  // Returns exist only for the pet store, which sells from its own catalogue.
  const products = await StoreProductModel.find({ _id: { $in: ret.items.map((i) => i.product_id) } })
    .select('hsn_code sku')
    .lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));
  return {
    order_id: ret.return_no,
    order_date: today(),
    pickup_customer_name: first,
    pickup_last_name: rest.join(' ') || '.',
    pickup_address: addr.line1,
    pickup_address_2: [addr.line2, addr.landmark].filter(Boolean).join(', '),
    pickup_city: addr.city,
    pickup_state: addr.state,
    pickup_country: addr.country || 'India',
    pickup_pincode: addr.pincode,
    pickup_email: addr.email || order.buyer_email,
    pickup_phone: String(addr.phone || order.buyer_phone || '').replaceAll(/\D/g, '').slice(-10),
    shipping_customer_name: warehouse.contact_name || warehouse.nickname,
    shipping_last_name: '.',
    shipping_address: warehouse.address_line1,
    shipping_address_2: warehouse.address_line2 ?? '',
    shipping_city: warehouse.city,
    shipping_state: warehouse.state,
    shipping_country: warehouse.country || 'India',
    shipping_pincode: warehouse.pincode,
    shipping_email: warehouse.email,
    shipping_phone: String(warehouse.phone ?? '').replaceAll(/\D/g, '').slice(-10),
    order_items: ret.items.map((i) => ({
      name: i.variant_label ? `${i.name} - ${i.variant_label}` : i.name,
      sku: productById.get(String(i.product_id))?.sku || i.name,
      units: i.qty,
      selling_price: i.unit_cost,
      hsn: productById.get(String(i.product_id))?.hsn_code ?? '',
    })),
    payment_method: 'Prepaid',
    sub_total: ret.items.reduce((sum, i) => sum + i.unit_cost * i.qty, 0),
    length: parcel.length_cm,
    breadth: parcel.breadth_cm,
    height: parcel.height_cm,
    weight: parcel.weight_kg,
  };
}

const addPickupEvent = (ret: IStoreReturn, status: string, note: string, at = new Date()) => {
  ret.pickup.events.push({ status, location: '', note, at });
};

/**
 * Book (or resume booking) the reverse pickup for an approved return. Never
 * throws: the reason lands on `pickup.last_error` and the operator retries.
 */
export async function bookReturnPickup(ret: IStoreReturn): Promise<IStoreReturn> {
  try {
    if (!ret.pickup.sr_order_id) {
      const order = await ProductOrderModel.findById(ret.order_id);
      if (!order?.shipping_address) throw shiprocketError('The original order has no address to collect from');
      const created = await createReturnOrder(await returnPayload(ret, order));
      ret.pickup.sr_order_id = created.order_id;
      ret.pickup.shipment_id = created.shipment_id;
      ret.pickup.status = 'BOOKED';
      addPickupEvent(ret, 'BOOKED', `ShipRocket return ${created.order_id} created`);
      await ret.save();
    }
    if (!ret.pickup.awb) {
      const awb = await assignAwb(ret.pickup.shipment_id, null, true);
      ret.pickup.awb = awb.awb;
      ret.pickup.courier_name = awb.courier_name;
      ret.pickup.status = 'PICKUP_SCHEDULED';
      addPickupEvent(ret, 'PICKUP_SCHEDULED', `AWB ${awb.awb} with ${awb.courier_name}`);
      if (ret.status === 'APPROVED') {
        ret.status = 'PICKUP_SCHEDULED';
        ret.events.push({ status: 'PICKUP_SCHEDULED', note: `Courier: ${awb.courier_name}, AWB ${awb.awb}`, by: 'ShipRocket', at: new Date() });
      }
    }
    ret.pickup.last_error = '';
  } catch (error) {
    ret.pickup.last_error = (error as Error).message;
    if (!ret.pickup.sr_order_id) ret.pickup.status = 'FAILED';
    logs.server.warn('shiprocket', 'bookReturnPickup', { return_no: ret.return_no, msg: ret.pickup.last_error });
  }
  ret.pickup.last_synced_at = new Date();
  await ret.save();
  return ret;
}

/** A courier label for a return shipment → where the return parcel is. */
function returnPickupStatus(raw: string): ReturnPickupStatus | null {
  const s = raw.trim().toUpperCase();
  if (!s) return null;
  if (s.includes('CANCEL')) return 'CANCELLED';
  if (s.includes('DELIVERED') && !s.includes('UNDELIVERED')) return 'DELIVERED';
  if (s.includes('PICKED UP') || s.includes('TRANSIT') || s.includes('SHIPPED') || s.includes('REACHED')) return 'IN_TRANSIT';
  if (s.includes('PICKUP')) return 'PICKUP_SCHEDULED';
  return null;
}

/** Fold tracking into a return; its arrival at the warehouse marks the return RECEIVED. */
export async function applyReturnTracking(ret: IStoreReturn, t: TrackResult) {
  const seen = new Set(ret.pickup.events.map((e) => `${new Date(e.at).getTime()}|${e.status}`));
  for (const a of t.activities) {
    const at = parseShiprocketDate(a.date) ?? new Date();
    if (seen.has(`${at.getTime()}|${a.status}`)) continue;
    ret.pickup.events.push({ status: a.status, location: a.location, note: a.note, at });
  }
  ret.pickup.tracking_status = t.current_status;
  ret.pickup.last_synced_at = new Date();
  const next = returnPickupStatus(t.current_status);
  if (next && ret.pickup.status !== 'DELIVERED') ret.pickup.status = next;
  const arrived = next === 'DELIVERED' && (ret.status === 'APPROVED' || ret.status === 'PICKUP_SCHEDULED');
  if (arrived) {
    ret.status = 'RECEIVED';
    ret.events.push({ status: 'RECEIVED', note: 'Reached the warehouse', by: 'ShipRocket', at: new Date() });
  }
  await ret.save();
  if (arrived) {
    const { mailReturnUpdate } = await import('@modules/commerce/store/store.emails');
    const order = await ProductOrderModel.findById(ret.order_id);
    await mailReturnUpdate(ret, order, `${order?.currency_symbol ?? '₹'}${ret.refund_amount.toFixed(2)}`);
  }
}
