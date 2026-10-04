import { logs } from '@observability/log';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { withShiprocketAccount } from '@modules/commerce/shiprocket/shiprocket.client';
import { accountForOrder } from '@modules/commerce/shiprocket/shiprocket.shipment';
import { trackByAwb, type TrackResult } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { applyReturnTracking, bookReturnPickup } from '@modules/commerce/shiprocket/shiprocket.returns';
import type { IPodShopReturn } from './podShopReturn.model';

/**
 * The courier leg of a pod-shop return. Booking and tracking are ShipRocket's
 * shared reverse-pickup code (shiprocket.returns); what is the pod shop's own
 * is the ACCOUNT — every call runs on the brand's ShipRocket account (or the
 * Duncit courier account for a DUNCIT_COURIER brand), whatever
 * `accountForOrder` resolves for the order being returned.
 */

/** Book (or resume booking) the reverse pickup. Never throws: a refusal lands on `pickup.last_error`. */
export async function bookPodShopReturnPickup(ret: IPodShopReturn, order: IProductOrder): Promise<IPodShopReturn> {
  await withShiprocketAccount(await accountForOrder(order), () => bookReturnPickup(ret));
  logs.server.info('podShopReturn', 'pickup', {
    return_no: ret.return_no,
    awb: ret.pickup.awb,
    status: ret.pickup.status,
    error: ret.pickup.last_error || undefined,
  });
  return ret;
}

/** Fold tracking into a return. Answers true when this update is the parcel reaching the warehouse. */
export async function applyPodShopReturnTracking(ret: IPodShopReturn, t: TrackResult): Promise<boolean> {
  let arrived = false;
  await applyReturnTracking(ret, t, () => {
    arrived = true;
    return Promise.resolve();
  });
  return arrived;
}

/** Pull tracking for one return on its brand's account. */
export async function pullPodShopReturnTracking(ret: IPodShopReturn): Promise<boolean> {
  const order = await ProductOrderModel.findById(ret.order_id);
  const account = order ? await accountForOrder(order) : null;
  const t = await withShiprocketAccount(account, () => trackByAwb(ret.pickup.awb));
  return applyPodShopReturnTracking(ret, t);
}
