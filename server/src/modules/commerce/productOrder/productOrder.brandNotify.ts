import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { notifyEach, type NotifyInput } from '@services/notify/notify.service';
import { sendEmail } from '@services/email/email.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';
import { trimTrailingSlash } from '@utils/url';
import { ProductOrderModel, type IProductOrder } from './productOrder.model';

/** "2 x Tug Rope, 1 x Ball" — this brand's own lines on the order, nobody else's. */
function linesFor(order: IProductOrder, productIds: ReadonlySet<string>): string {
  return order.line_items
    .filter((line) => productIds.has(String(line.product_id)))
    .map((line) => `${line.qty} x ${line.name}`)
    .join(', ');
}

/** Each brand owner behind these orders, with the product ids that are theirs. */
async function productsByOwnerOf(orders: readonly IProductOrder[]): Promise<Map<string, Set<string>>> {
  const productIds = orders.flatMap((order) => order.line_items.map((line) => line.product_id));
  const products = await InventoryProductModel.find({ _id: { $in: productIds } })
    .select('listing_submitted_by_id')
    .lean();
  const productsByOwner = new Map<string, Set<string>>();
  for (const product of products) {
    const ownerId = String(product.listing_submitted_by_id ?? '');
    if (!Types.ObjectId.isValid(ownerId)) continue;
    const set = productsByOwner.get(ownerId) ?? new Set<string>();
    set.add(String(product._id));
    productsByOwner.set(ownerId, set);
  }
  return productsByOwner;
}

/** What a brand is told about a delivery that went wrong. */
const ISSUE_LABEL: Partial<Record<string, string>> = {
  NDR: 'The courier could not deliver it and is waiting for an answer',
  RTO: 'It is being returned to you by the courier',
  RTO_DELIVERED: 'It has come back to your pickup address',
  LOST: 'The courier reported it lost',
};

/**
 * Tell the brand when one of its pod-shop deliveries goes wrong: a failed
 * attempt (NDR) needs an answer in the brand's own ShipRocket account, and a
 * return to origin means stock coming back. Email only — this is the seller's
 * desk work, not something to buzz a phone for. Keyed per order and status.
 */
export async function notifyBrandsOfDeliveryIssue(order: IProductOrder): Promise<void> {
  const issue = ISSUE_LABEL[order.fulfilment_status];
  if (!issue) return;
  try {
    const productsByOwner = await productsByOwnerOf([order]);
    if (productsByOwner.size === 0) return;
    const [users, { partnersUrl }] = await Promise.all([
      loadNotifyRecipients([...productsByOwner.keys()]),
      getUrlConfigs(),
    ]);
    for (const [ownerId, owned] of productsByOwner) {
      const user = users.get(ownerId);
      const to = user?.auth?.email ?? '';
      const items = linesFor(order, owned);
      if (!to || !items) continue;
      // eslint-disable-next-line no-await-in-loop -- one brand at a time
      await sendEmail({
        to,
        subject: `Delivery issue on order ${order.order_no}`,
        template: 'ecomm-order-delivery-issue',
        category: 'transactional',
        vars: {
          name: recipientName(user),
          order_no: order.order_no,
          items,
          issue,
          order_url: `${trimTrailingSlash(partnersUrl)}/ecomm-brand/orders/${String(order._id)}`,
        },
      });
    }
  } catch (error) {
    logs.server.error('productOrder', 'notifyBrandsOfDeliveryIssue', { error, order_no: order.order_no });
  }
}

/**
 * Tell each brand behind a paid pod-shop order that it has something to send.
 *
 * Brands found new orders only by opening the Partners console, and an order
 * nobody packs is a buyer waiting on a parcel that never leaves. One message
 * per brand owner per order, naming only that brand's lines — an order mixing
 * two brands' products is two messages, each about its own half.
 *
 * Runs after the payment has committed, from the finalizer's post-commit steps.
 * The pet store sells Duncit's own catalogue, so it has no partner to tell.
 * Never throws.
 */
export async function notifyBrandsOfNewOrders(payment: { _id: unknown; metadata?: Record<string, unknown> | null }) {
  if (payment.metadata?.store) return;
  try {
    const orders = await ProductOrderModel.find({ payment_id: payment._id, channel: { $ne: 'PET_STORE' } });
    if (orders.length === 0) return;
    const productsByOwner = await productsByOwnerOf(orders);
    if (productsByOwner.size === 0) return;
    const [users, { partnersUrl }] = await Promise.all([
      loadNotifyRecipients([...productsByOwner.keys()]),
      getUrlConfigs(),
    ]);
    const inputs: NotifyInput[] = [];
    for (const order of orders) {
      for (const [ownerId, owned] of productsByOwner) {
        const items = linesFor(order, owned);
        const user = users.get(ownerId);
        if (!items || !user) continue;
        const name = recipientName(user);
        inputs.push({
          event: 'ECOMM_NEW_ORDER',
          entityId: `${String(order._id)}:${ownerId}`,
          user,
          name,
          params: [
            name,
            order.order_no,
            items,
            `${trimTrailingSlash(partnersUrl)}/ecomm-brand/orders/${String(order._id)}`,
          ],
        });
      }
    }
    if (inputs.length > 0) await notifyEach(inputs);
  } catch (error) {
    logs.server.error('productOrder', 'notifyBrandsOfNewOrders', { error });
  }
}
