import { logs } from '@observability/log';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { PACKAGING_LIMITS } from '@modules/venues/inventory/inventory.packaging';
import { shiprocketError, withShiprocketAccount, type Json } from '@modules/commerce/shiprocket/shiprocket.client';
import { accountForOrder } from '@modules/commerce/shiprocket/shiprocket.shipment';
import {
  assignAwb,
  createReturnOrder,
  parseShiprocketDate,
  trackByAwb,
  type TrackResult,
} from '@modules/commerce/shiprocket/shiprocket.gateway';
import { buildParcel, withWeights, type Parcel } from '@modules/commerce/shiprocket/shiprocket.parcel';
import type { IPodShopReturn, PodShopReturnStatus } from './podShopReturn.model';
import type { ReturnPickupStatus } from './returnPickup.schema';

/**
 * The courier leg of a pod-shop return: a ShipRocket reverse pickup from the
 * buyer's address to the brand warehouse the order shipped from, booked and
 * tracked on the BRAND's own ShipRocket account (or the Duncit courier account
 * for a DUNCIT_COURIER brand) — whatever `accountForOrder` resolves.
 *
 * Booked when the brand or the Products team approves the return; tracked by
 * the courier webhook and the 6-hourly sweep. Arrival at the warehouse marks
 * the return RECEIVED. The pet store has its own (shiprocket.returns) — the
 * two shops share no return code (rule 65).
 */

const today = () => new Date().toISOString().slice(0, 10);

/** The returned units as a parcel, from the dimensions the order snapshotted. */
function returnParcel(ret: IPodShopReturn, order: IProductOrder): Parcel {
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

const digits10 = (phone: unknown) => String(phone ?? '').replaceAll(/\D/g, '').slice(-10);

async function returnPayload(ret: IPodShopReturn, order: IProductOrder): Promise<Json> {
  const warehouse = await BrandPickupLocationModel.findOne({ nickname: order.pickup_location_id }).lean();
  if (!warehouse) throw shiprocketError(`There is no warehouse "${order.pickup_location_id}" to return this to`);
  const addr = order.shipping_address;
  if (!addr) throw shiprocketError('The original order has no address to collect from');
  const [first = 'Customer', ...rest] = String(addr.name || order.buyer_name).trim().split(/\s+/);
  const parcel = returnParcel(ret, order);
  const products = await InventoryProductModel.find({ _id: { $in: ret.items.map((i) => i.product_id) } })
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
    pickup_phone: digits10(addr.phone || order.buyer_phone),
    shipping_customer_name: warehouse.contact_name || warehouse.nickname,
    shipping_last_name: '.',
    shipping_address: warehouse.address_line1,
    shipping_address_2: warehouse.address_line2 ?? '',
    shipping_city: warehouse.city,
    shipping_state: warehouse.state,
    shipping_country: warehouse.country || 'India',
    shipping_pincode: warehouse.pincode,
    shipping_email: warehouse.email,
    shipping_phone: digits10(warehouse.phone),
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

const pickupEvent = (ret: IPodShopReturn, status: string, note: string, at = new Date()) => {
  ret.pickup.events.push({ status, location: '', note, at });
};

const moveReturn = (ret: IPodShopReturn, status: PodShopReturnStatus, note: string) => {
  ret.status = status;
  ret.events.push({ status, note, by: 'ShipRocket', at: new Date() });
};

async function bookOnAccount(ret: IPodShopReturn, order: IProductOrder) {
  if (!ret.pickup.sr_order_id) {
    const created = await createReturnOrder(await returnPayload(ret, order));
    ret.pickup.sr_order_id = created.order_id;
    ret.pickup.shipment_id = created.shipment_id;
    ret.pickup.status = 'BOOKED';
    pickupEvent(ret, 'BOOKED', `ShipRocket return ${created.order_id} created`);
    // Saved before the AWB call, so a retry resumes instead of creating a second return order.
    await ret.save();
  }
  if (!ret.pickup.awb) {
    const awb = await assignAwb(ret.pickup.shipment_id, null, true);
    ret.pickup.awb = awb.awb;
    ret.pickup.courier_name = awb.courier_name;
    ret.pickup.status = 'PICKUP_SCHEDULED';
    pickupEvent(ret, 'PICKUP_SCHEDULED', `AWB ${awb.awb} with ${awb.courier_name}`);
    if (ret.status === 'APPROVED') moveReturn(ret, 'PICKUP_SCHEDULED', `Courier: ${awb.courier_name}, AWB ${awb.awb}`);
  }
}

/**
 * Book (or resume booking) the reverse pickup. Never throws: ShipRocket's
 * refusal lands on `pickup.last_error` for the brand / Products team to retry.
 */
export async function bookPodShopReturnPickup(ret: IPodShopReturn, order: IProductOrder): Promise<IPodShopReturn> {
  try {
    await withShiprocketAccount(await accountForOrder(order), () => bookOnAccount(ret, order));
    ret.pickup.last_error = '';
  } catch (error) {
    ret.pickup.last_error = (error as Error).message;
    if (!ret.pickup.sr_order_id) ret.pickup.status = 'FAILED';
    logs.server.warn('podShopReturn', 'bookPickup', { return_no: ret.return_no, msg: ret.pickup.last_error });
  }
  ret.pickup.last_synced_at = new Date();
  await ret.save();
  logs.server.info('podShopReturn', 'pickup', { return_no: ret.return_no, awb: ret.pickup.awb, status: ret.pickup.status });
  return ret;
}

/** A courier label for a return shipment → where the return parcel is. */
function pickupStatusOf(raw: string): ReturnPickupStatus | null {
  const s = raw.trim().toUpperCase();
  if (!s) return null;
  if (s.includes('CANCEL')) return 'CANCELLED';
  if (s.includes('DELIVERED') && !s.includes('UNDELIVERED')) return 'DELIVERED';
  if (s.includes('PICKED UP') || s.includes('TRANSIT') || s.includes('SHIPPED') || s.includes('REACHED')) return 'IN_TRANSIT';
  if (s.includes('PICKUP')) return 'PICKUP_SCHEDULED';
  return null;
}

/** Fold tracking into a return. Answers true when this update is the parcel reaching the warehouse. */
export async function applyPodShopReturnTracking(ret: IPodShopReturn, t: TrackResult): Promise<boolean> {
  const seen = new Set(ret.pickup.events.map((e) => `${new Date(e.at).getTime()}|${e.status}`));
  for (const a of t.activities) {
    const at = parseShiprocketDate(a.date) ?? new Date();
    if (seen.has(`${at.getTime()}|${a.status}`)) continue;
    ret.pickup.events.push({ status: a.status, location: a.location, note: a.note, at });
  }
  ret.pickup.tracking_status = t.current_status;
  ret.pickup.last_synced_at = new Date();
  const next = pickupStatusOf(t.current_status);
  if (next && ret.pickup.status !== 'DELIVERED') ret.pickup.status = next;
  const arrived = next === 'DELIVERED' && (ret.status === 'APPROVED' || ret.status === 'PICKUP_SCHEDULED');
  if (arrived) moveReturn(ret, 'RECEIVED', 'Reached the warehouse');
  await ret.save();
  return arrived;
}

/** Pull tracking for one return on its brand's account. */
export async function pullPodShopReturnTracking(ret: IPodShopReturn): Promise<boolean> {
  const order = await ProductOrderModel.findById(ret.order_id);
  const account = order ? await accountForOrder(order) : null;
  const t = await withShiprocketAccount(account, () => trackByAwb(ret.pickup.awb));
  return applyPodShopReturnTracking(ret, t);
}
