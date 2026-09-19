import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { productOrderService } from '@modules/commerce/productOrder/productOrder.service';
import {
  clearParcelOverride,
  courierChoices,
  createShipment,
  documentFile,
  setParcelOverride,
  type ShipmentDocument,
} from '@modules/commerce/shiprocket/shiprocket.shipment';
import { answerNdr, shiprocketAccountStatus } from '@modules/commerce/shiprocket/shiprocket.ops';
import { retryShiprocketLogin } from '@modules/commerce/shiprocket/shiprocket.client';
import { bookReturnPickup } from '@modules/commerce/shiprocket/shiprocket.returns';
import { COURIER_WEBHOOK_PATH } from '@modules/commerce/shiprocket/shiprocket.webhook';
import type { ParcelDims } from '@modules/commerce/shiprocket/shiprocket.parcel';
import { StoreReturnModel } from './storeReturn.model';
import { cleanAddress } from './store.checkout.service';
import { deliveredAt } from './store.order.mapper';
import { restock } from './store.order.service';
import { toReturnPub } from './store.return.service';
import { badInput, iso, notFound, round2, toObjectId } from './store.shared';

/**
 * The ecomm portal's shipping desk: book a shipment with a chosen courier,
 * correct the parcel or the address before booking, print labels, invoices
 * and manifests, answer failed deliveries, and see the ShipRocket account's
 * health — plus the reverse pickups of approved returns.
 */

const PET_STORE = { channel: 'PET_STORE' } as const;

async function storeOrder(id: string) {
  const oid = toObjectId(id);
  const order = oid ? await ProductOrderModel.findOne({ _id: oid, ...PET_STORE }) : null;
  if (!order) notFound('Order not found');
  return order;
}

const NDR_ACTION = { REATTEMPT: 're-attempt', RETURN: 'return' } as const;

/** How many failed bookings one "retry all" works through — each is a courier call. */
const RETRY_BATCH = 50;

export const storeShippingService = {
  /** Book (or resume booking) with the chosen courier — ShipRocket's recommendation when none. */
  async book(id: string, courierId?: string | null) {
    const order = await storeOrder(id);
    if (order.cancelled_at) badInput('This order was cancelled');
    await createShipment(order, courierId);
    return productOrderService.toPub(order);
  },

  async couriers(id: string) {
    return courierChoices(await storeOrder(id));
  },

  /** Replace the computed parcel before booking; null input goes back to the computed one. */
  async setParcel(id: string, input: ParcelDims | null) {
    const order = await storeOrder(id);
    if (input) setParcelOverride(order, input);
    else clearParcelOverride(order);
    await order.save();
    return productOrderService.toPub(order);
  },

  /** Correct the ship-to address — only before ShipRocket has the order. */
  async updateAddress(id: string, input: Parameters<typeof cleanAddress>[0]) {
    const order = await storeOrder(id);
    if (order.shiprocket.order_id) badInput('The shipment is already booked with this address — cancel it with the courier first');
    order.shipping_address = cleanAddress(input) as IProductOrder['shipping_address'];
    order.notes.push({ text: 'Ship-to address corrected', by_id: '', by_name: 'ecomm portal', at: new Date() } as any);
    await order.save();
    return productOrderService.toPub(order);
  },

  /** One PDF (label, invoice or manifest) for the given orders, as a file to print or save. */
  async file(ids: string[], kind: ShipmentDocument) {
    const oids = ids.map(toObjectId).filter(Boolean);
    const orders = await ProductOrderModel.find({ _id: { $in: oids }, ...PET_STORE });
    if (orders.length === 0) notFound('No orders selected');
    return documentFile(orders, kind);
  },

  /**
   * Book again every order whose booking failed — oldest first — once what
   * stopped them (the login, a pickup address, the wallet) is fixed. Each
   * resumes where it stopped, so none is ever booked twice.
   */
  async retryFailedBookings() {
    const orders = await ProductOrderModel.find({
      ...PET_STORE,
      cancelled_at: null,
      fulfilment_method: 'SHIP',
      fulfilment_status: 'FAILED',
    })
      .sort({ created_at: 1 })
      .limit(RETRY_BATCH);
    for (const order of orders) await createShipment(order);
    return {
      attempted: orders.length,
      booked: orders.filter((o) => o.shiprocket.awb).length,
      failed: orders.filter((o) => o.fulfilment_status === 'FAILED').length,
    };
  },

  async answerNdr(id: string, action: keyof typeof NDR_ACTION, comments?: string | null) {
    const order = await answerNdr(await storeOrder(id), NDR_ACTION[action], comments ?? '');
    return productOrderService.toPub(order);
  },

  /** Orders an operator must act on: failed bookings, a low wallet, failed deliveries. */
  async alerts() {
    const orders = await ProductOrderModel.find({
      ...PET_STORE,
      cancelled_at: null,
      $or: [{ fulfilment_status: 'FAILED' }, { fulfilment_status: 'NDR' }, { 'shiprocket.alert': { $ne: '' } }],
    })
      .sort({ updated_at: -1 })
      .limit(200);
    return orders.map(productOrderService.toPub);
  },

  async status() {
    return { ...(await shiprocketAccountStatus()), webhook_path: `/webhooks${COURIER_WEBHOOK_PATH}` };
  },

  /** Log in again once with the saved credentials, clearing an earlier refusal. */
  async reconnect() {
    await retryShiprocketLogin();
    return this.status();
  },

  /**
   * What the couriers collected in cash. ShipRocket's remittance ledger is not
   * in its public API, so this is our side of the reconciliation: every COD
   * order, when it was delivered and what it was worth.
   */
  async codLedger(days = 30) {
    const since = new Date(Date.now() - Math.max(1, Math.min(365, days)) * 86_400_000);
    const orders = await ProductOrderModel.find({ ...PET_STORE, payment_method: 'COD', created_at: { $gte: since } })
      .sort({ created_at: -1 })
      .limit(1000);
    const rows = orders.map((o) => ({
      order_id: String(o._id),
      order_no: o.order_no,
      buyer_name: o.buyer_name,
      cod_amount: o.cod_amount,
      status: o.fulfilment_status,
      awb: o.shiprocket?.awb ?? '',
      delivered_at: iso(deliveredAt(o)),
      collected_at: iso(o.cod_collected_at),
    }));
    const delivered = rows.filter((r) => r.status === 'DELIVERED');
    const total = round2(delivered.reduce((s, r) => s + r.cod_amount, 0));
    const collected = round2(delivered.filter((r) => r.collected_at).reduce((s, r) => s + r.cod_amount, 0));
    return { rows, total_cod: total, collected, outstanding: round2(total - collected) };
  },

  /** Book (or retry) the reverse pickup of an approved return. */
  async bookReturnPickup(id: string) {
    const ret = await StoreReturnModel.findById(toObjectId(id));
    if (!ret) notFound('Return not found');
    if (!['APPROVED', 'PICKUP_SCHEDULED'].includes(ret.status)) badInput('Approve the return before booking its pickup');
    return toReturnPub(await bookReturnPickup(ret));
  },

  /** Put a received return's units back on the shelf (once). */
  async restockReturn(id: string) {
    const ret = await StoreReturnModel.findById(toObjectId(id));
    if (!ret) notFound('Return not found');
    if (!['RECEIVED', 'REFUNDED', 'CLOSED'].includes(ret.status)) badInput('Restock a return once it has been received');
    if (!ret.restocked) {
      await restock(ret.items);
      ret.restocked = true;
      ret.events.push({ status: ret.status, note: 'Restocked', by: 'ecomm portal', at: new Date() });
      await ret.save();
    }
    return toReturnPub(ret);
  },
};
