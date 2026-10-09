import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { ownedBrandIds } from '@modules/venues/ecommBrand/ecommBrand.model';
import { addressProblems } from '@modules/commerce/shiprocket/shiprocket.address';
import type { ShipmentDocument } from '@modules/commerce/shiprocket/shiprocket.shipment';
import type { TableQueryInput } from '@utils/table-query';
import { ProductOrderModel, type IProductOrder } from './productOrder.model';
import { productOrderService } from './productOrder.service';

/**
 * A partner brand's own pod-shop orders — the Partner console's and the Studio's
 * Orders desk. Every order is one (pod, warehouse) group, so all of its lines
 * carry one brand; an order belongs to a partner when that brand is theirs.
 */

export interface ShipToInput {
  name: string;
  phone: string;
  email?: string | null;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string | null;
}

const notFound = (): never => {
  throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
};

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const ownedScope = async (userId: string) => ({
  channel: 'POD_SHOP',
  'line_items.brand_id': { $in: await ownedBrandIds(userId) },
});

/** One order of the partner's brands (404 for anyone else's, so ids cannot be probed). */
async function ownedOrder(userId: string, id: string): Promise<IProductOrder> {
  if (!Types.ObjectId.isValid(id)) return notFound();
  const order = await ProductOrderModel.findOne({ _id: new Types.ObjectId(id), ...(await ownedScope(userId)) });
  return order ?? notFound();
}

/** A courier-ready ship-to, or why it is not one. */
function cleanShipTo(input: ShipToInput) {
  const text = (v: string | null | undefined) => String(v ?? '').trim();
  const out = {
    name: text(input.name),
    phone: text(input.phone).replaceAll(/\D/g, '').slice(-10),
    email: text(input.email).toLowerCase(),
    line1: text(input.line1),
    line2: text(input.line2),
    landmark: text(input.landmark),
    city: text(input.city),
    state: text(input.state),
    pincode: text(input.pincode).replaceAll(/\D/g, ''),
    country: text(input.country) || 'India',
  };
  if (!out.name) bad('Enter the name to deliver to');
  const problems = addressProblems(out);
  if (problems.length > 0) bad(`Enter ${problems.join(' and ')}`);
  return out;
}

export const brandProductOrderService = {
  async table(userId: string, query?: TableQueryInput | null, brandId?: string | null) {
    const owned = await ownedBrandIds(userId);
    const scoped = brandId ? owned.filter((b) => String(b) === brandId) : owned;
    return productOrderService.tableForBrands(scoped, query);
  },

  async get(userId: string, id: string) {
    return productOrderService.toPub(await ownedOrder(userId, id));
  },

  /** Book, or resume booking, the ShipRocket shipment — resumes where it stopped, never books twice. */
  async book(userId: string, id: string) {
    const order = await ownedOrder(userId, id);
    if (order.cancelled_at) bad('This order was cancelled');
    return productOrderService.createShipmentForOrder(String(order._id));
  },

  async refreshTracking(userId: string, id: string) {
    const order = await ownedOrder(userId, id);
    return productOrderService.refreshTrackingById(String(order._id));
  },

  /** Correct the ship-to — only before ShipRocket has the order. */
  async updateAddress(userId: string, id: string, input: ShipToInput, byName: string) {
    const order = await ownedOrder(userId, id);
    if (order.fulfilment_method !== 'SHIP') bad('Only a shipped order has a delivery address');
    if (order.shiprocket.order_id) bad('The shipment is already booked with this address — cancel it with the courier first');
    order.shipping_address = cleanShipTo(input) as IProductOrder['shipping_address'];
    order.notes.push({ text: 'Ship-to address corrected', by_id: userId, by_name: byName, at: new Date() });
    await order.save();
    return productOrderService.toPub(order);
  },

  /** One PDF for the given orders — every one of them must be the partner's. */
  async shipmentFile(userId: string, ids: string[], kind: ShipmentDocument) {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    const count = await ProductOrderModel.countDocuments({
      _id: { $in: valid.map((id) => new Types.ObjectId(id)) },
      ...(await ownedScope(userId)),
    });
    if (valid.length === 0 || count !== ids.length) notFound();
    return productOrderService.shipmentFile(valid, kind);
  },
};
