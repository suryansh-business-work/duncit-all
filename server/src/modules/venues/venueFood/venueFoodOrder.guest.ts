import type { GraphQLContext } from '@context';
import { getImagekitAuth, getImagekitConfig } from '@modules/platform/upload/upload.service';
import { resolveUploadFolder } from '@modules/platform/upload/uploadFolder';
import { logs } from '@observability/log';
import { renderVenueFoodInvoice } from './venueFoodInvoice.pdf';
import { FOOD_FEEDBACK_LIMITS, VenueFoodOrderModel, type IVenueFoodOrder } from './venueFoodOrder.model';
import { splitFoodGst } from './venueFoodOrder.pricing';
import {
  FOOD_LOG,
  assertOrderAccess,
  badInput,
  fail,
  foodOrderTax,
  hasFoodInvoice,
  objectId,
  rupees,
  text,
  toFoodOrderPub,
} from './venueFoodOrder.shared';
import { whatsappFoodFeedbackReceived } from './venueFoodOrder.whatsapp';

/**
 * What a guest does with an order after it is paid: download its invoice, and —
 * once it is served — rate the food, with photos if they like.
 *
 * Everything is PUBLIC and proven the way reading the order is: by the order's
 * access key, or by being the account that placed it.
 */

/** The feature folder a feedback photo is filed under (see uploadFolder ROUTES). */
const FEEDBACK_FOLDER = 'venue-food-feedback';
/** What an upload pass is attributed to when the guest has no account. */
const GUEST_UPLOADER = 'venue-food-guest';

export interface FoodFeedbackInput {
  order_id: string;
  access_key?: string | null;
  rating: number;
  comment?: string | null;
  images?: string[] | null;
}

async function guestOrder(ctx: GraphQLContext, orderId: string, accessKey?: string | null) {
  const order = await VenueFoodOrderModel.findById(objectId(orderId, 'Invalid order id')).select('+access_key');
  if (!order) return fail('NOT_FOUND', 'Order not found');
  assertOrderAccess(ctx, order, accessKey);
  return order;
}

const refundNote = (order: IVenueFoodOrder) => {
  if (order.payment_status === 'REFUNDED') return 'This order was cancelled and refunded in full.';
  if (order.payment_status === 'REFUND_PENDING') return 'This order was cancelled. A full refund is on its way.';
  return '';
};

const BAD_PHOTO = 'A photo could not be read — remove it and add it again';

const hostOf = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.host : '';
  } catch {
    return '';
  }
};

/**
 * A photo may only be one this platform stored: an https address on the media
 * host uploads are served from. Anything else would let the form be used to
 * put an arbitrary link in front of the venue owner.
 */
async function ownMediaUrls(images: readonly string[]): Promise<string[]> {
  if (images.length === 0) return [];
  const mediaHost = hostOf((await getImagekitConfig()).urlEndpoint ?? '');
  return images.map((image) => {
    const value = text(image);
    const host = hostOf(value);
    if (!host || !mediaHost || host !== mediaHost) return badInput(BAD_PHOTO);
    return value;
  });
}

export const venueFoodGuestService = {
  /** The order's invoice as base64 PDF. Counted, so the venue can see its invoices being used. */
  async invoicePdfBase64(ctx: GraphQLContext, orderId: string, accessKey?: string | null) {
    const order = await guestOrder(ctx, orderId, accessKey);
    if (!hasFoodInvoice(order)) return fail('BAD_REQUEST', 'An invoice is ready once the order is paid');
    const tax = foodOrderTax(order);
    const { cgst_paise, sgst_paise } = splitFoodGst(tax.tax_paise);
    const pdf = await renderVenueFoodInvoice({
      invoice_no: order.order_no,
      issued_at: order.paid_at ?? order.created_at,
      venue_name: order.venue_name,
      venue_address: order.venue_address ?? '',
      venue_gstin: order.venue_gstin ?? '',
      venue_fssai: order.venue_fssai ?? '',
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      table_label: order.table_label ?? '',
      currency_symbol: order.currency_symbol ?? '',
      lines: order.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unit: rupees(line.unit_paise),
        total: rupees(line.line_paise),
      })),
      subtotal: rupees(order.subtotal_paise),
      discount_pct: order.discount_pct ?? 0,
      discount: rupees(order.discount_paise ?? 0),
      coupon_code: order.coupon_code ?? '',
      coupon_discount: rupees(order.coupon_discount_paise ?? 0),
      tax_mode: tax.tax_mode,
      gst_pct: tax.gst_pct,
      taxable: rupees(tax.taxable_paise),
      cgst: rupees(cgst_paise),
      sgst: rupees(sgst_paise),
      total: rupees(order.total_paise),
      payment_reference: order.razorpay_payment_id ?? '',
      refund_note: refundNote(order),
    });
    await VenueFoodOrderModel.updateOne(
      { _id: order._id },
      { $inc: { invoice_downloads: 1 }, $set: { invoice_downloaded_at: new Date() } },
      // The count is bookkeeping, not an edit of the order.
      { timestamps: false }
    );
    logs.server.info(FOOD_LOG, 'invoice', { orderNo: order.order_no, venueId: order.venue_id.toHexString() });
    return pdf.toString('base64');
  },

  /**
   * A one-shot pass to upload ONE feedback photo, for an order that can still
   * be rated. The folder is fixed here, on the pass — the upload itself carries
   * nothing but the ticket.
   */
  async feedbackUploadPass(ctx: GraphQLContext, orderId: string, accessKey?: string | null) {
    const order = await guestOrder(ctx, orderId, accessKey);
    if (order.status !== 'SERVED') return fail('BAD_REQUEST', 'You can rate an order once it has been served');
    if (order.feedback?.submitted_at) return fail('CONFLICT', 'This order has already been rated');
    const folder = resolveUploadFolder(FEEDBACK_FOLDER, { entityId: order.venue_id.toHexString() });
    const uploader = order.user_id?.toHexString() ?? GUEST_UPLOADER;
    return getImagekitAuth(uploader, folder, 'mweb');
  },

  /**
   * Rate a served order — once. The write is guarded by the feedback being
   * absent, so two taps (or two devices) cannot both save one.
   */
  async submitFeedback(ctx: GraphQLContext, input: FoodFeedbackInput) {
    const order = await guestOrder(ctx, input.order_id, input.access_key);
    const { ratingMin, ratingMax, commentMax, imagesMax } = FOOD_FEEDBACK_LIMITS;
    const rating = Number(input.rating);
    if (!Number.isInteger(rating) || rating < ratingMin || rating > ratingMax) badInput('Choose a rating from 1 to 5');
    const comment = text(input.comment);
    if (comment.length > commentMax) badInput(`Keep your feedback under ${commentMax} characters`);
    const asked = Array.isArray(input.images) ? input.images : [];
    if (asked.length > imagesMax) badInput(`You can add at most ${imagesMax} photos`);
    const images = await ownMediaUrls(asked);
    if (order.status !== 'SERVED') return fail('BAD_REQUEST', 'You can rate an order once it has been served');

    const rated = await VenueFoodOrderModel.findOneAndUpdate(
      { _id: order._id, status: 'SERVED', feedback: { $exists: false } },
      { $set: { feedback: { rating, comment, images, submitted_at: new Date() } } },
      { new: true }
    );
    if (!rated) return fail('CONFLICT', 'This order has already been rated');
    logs.server.info(FOOD_LOG, 'feedback', {
      orderNo: rated.order_no,
      venueId: rated.venue_id.toHexString(),
      rating,
      photos: images.length,
    });
    await whatsappFoodFeedbackReceived(rated);
    return toFoodOrderPub(rated);
  },
};
