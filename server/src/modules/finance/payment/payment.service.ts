import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { PaymentModel, type IPayment } from './payment.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings, nextInvoiceNumber } from '@modules/finance/finance/finance.model';
import { sendEmail } from '@services/email/email.service';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { getUrlConfigs } from '@config/url-configs';
import {
  createRazorpayOrder,
  getRazorpayKeys,
  verifyRazorpaySignature,
} from './razorpay.gateway';
import { couponService } from '@modules/finance/coupon/coupon.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

const toPub = (p: IPayment) => ({
  id: String(p._id),
  payment_id: p.payment_id,
  invoice_no: p.invoice_no,
  user_id: String(p.user_id),
  user_name: p.user_name,
  user_email: p.user_email,
  user_phone: p.user_phone,
  billing_address: p.billing_address ?? '',
  checkout_url: p.checkout_url ?? '',
  target_type: p.target_type,
  pod_id: p.pod_id ? String(p.pod_id) : null,
  description: p.description,
  subtotal: p.subtotal,
  platform_fee_pct: p.platform_fee_pct,
  platform_fee_amount: p.platform_fee_amount,
  gst_pct: p.gst_pct,
  gst_amount: p.gst_amount,
  total: p.total,
  currency_symbol: p.currency_symbol,
  coupon_code: p.coupon_code ?? null,
  coupon_discount: p.coupon_discount ?? 0,
  status: p.status,
  gateway: p.gateway,
  gateway_ref: p.gateway_ref,
  paid_at: p.paid_at ? p.paid_at.toISOString() : null,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

export interface QuoteBreakup {
  subtotal: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  gst_pct: number;
  gst_amount: number;
  total: number;
  currency_symbol: string;
  dummy_mode: boolean;
}

export async function computeQuote(amount: number, opts?: { inclusive?: boolean }): Promise<QuoteBreakup> {
  const fs = await getFinanceSettings();
  const f = fs.platform_fee_pct / 100;
  const g = fs.gst_pct / 100;
  const inclusive = opts?.inclusive !== false; // default: pod_amount is gross/total
  const gross = Math.max(0, Number(amount) || 0);
  let subtotal: number;
  if (inclusive) {
    const divisor = (1 + f) * (1 + g);
    subtotal = round2(divisor > 0 ? gross / divisor : gross);
  } else {
    subtotal = round2(gross);
  }
  const platform_fee_amount = round2(subtotal * f);
  const gst_amount = round2((subtotal + platform_fee_amount) * g);
  const total = inclusive
    ? round2(gross)
    : round2(subtotal + platform_fee_amount + gst_amount);
  return {
    subtotal,
    platform_fee_pct: fs.platform_fee_pct,
    platform_fee_amount,
    gst_pct: fs.gst_pct,
    gst_amount,
    total,
    currency_symbol: fs.currency_symbol,
    dummy_mode: fs.dummy_mode,
  };
}

const newPaymentId = () =>
  `pay_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;

function selectedProductTotal(pod: any, selectedProducts: any[] = []) {
  const allowed = new Map<string, any>((pod.product_requests ?? []).map((item: any) => [String(item.product_id), item]));
  const selected = new Map<string, number>();
  for (const item of selectedProducts) {
    const productId = String(item?.product_id || '');
    const quantity = Number(item?.quantity) || 0;
    if (!productId || quantity <= 0) continue;
    selected.set(productId, (selected.get(productId) ?? 0) + quantity);
  }
  let total = 0;
  for (const [productId, quantity] of selected) {
    const product = allowed.get(productId);
    if (!product) {
      throw new GraphQLError('Selected product is not available for this pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (quantity > Number(product.quantity || 0)) {
      throw new GraphQLError(`Only ${product.quantity} ${product.product_name} available`, { extensions: { code: 'BAD_USER_INPUT' } });
    }
    total += Number(product.unit_cost || 0) * quantity;
  }
  return round2(total);
}

const userDisplayName = (user: any) =>
  [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || 'Customer';

/** The metadata blob recorded on every payment doc (source + pod breakdown). */
const paymentMetadata = (input: any, pod: any) => ({
  source: 'app_checkout',
  checkout_url: input.checkout_url,
  pod_id: input.pod_id || null,
  ticket_amount: pod ? Number(pod.pod_amount || 0) : null,
  product_cost_total: pod ? selectedProductTotal(pod, input.selected_products ?? []) : null,
  selected_products: input.selected_products ?? [],
});

/** Apply an optional coupon to the gross payable, returning the priced quote, the
 * undiscounted original total (for strikethrough/records) and the coupon meta.
 * Throws when a supplied coupon is invalid — never silently ignores it. */
async function applyCoupon(input: any, payableAmount: number, userId: string) {
  const originalQuote = await computeQuote(payableAmount);
  const code = (input.coupon_code || '').trim();
  if (!code) {
    return {
      quote: originalQuote,
      originalTotal: originalQuote.total,
      couponCode: null as string | null,
      couponDiscount: 0,
    };
  }
  const result = await couponService.evaluate(code, input.pod_id ?? null, payableAmount, userId);
  if (!result.ok)
    throw new GraphQLError(result.message ?? 'Invalid coupon', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  const quote = await computeQuote(result.final_total);
  return {
    quote,
    originalTotal: originalQuote.total,
    couponCode: result.coupon!.code,
    couponDiscount: round2(originalQuote.total - quote.total),
  };
}

/** Resolve what the user actually pays (pod ticket + selected products, or a raw
 * amount) plus the human description. Shared by the dummy + Razorpay flows. */
async function resolvePayable(input: any) {
  let pod: any = null;
  let payableAmount = Number(input.amount) || 0;
  let description = input.description || 'Booking';
  if (input.pod_id) {
    pod = await PodModel.findById(input.pod_id);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    if (pod.pod_date_time && new Date(pod.pod_date_time).getTime() < Date.now()) {
      throw new GraphQLError('This pod has already taken place — booking is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    description = `Pod booking · ${pod.pod_title}`;
    payableAmount = round2(
      Number(pod.pod_amount || 0) + selectedProductTotal(pod, input.selected_products ?? [])
    );
  }
  if (!payableAmount || payableAmount <= 0)
    throw new GraphQLError('Amount must be greater than 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  return { pod, payableAmount, description };
}

/** Books the slot + records the PodMember row + evaluates badges for a paid pod. */
async function bookPodForPayment(pod: any, userId: any, paymentDocId: string) {
  if (!pod) return;
  try {
    if (!pod.pod_attendees.some((u: any) => String(u) === String(userId))) {
      pod.pod_attendees.push(userId);
      await pod.save();
    }
  } catch (e) {
    console.warn('Pod attendee update failed', e);
  }
  try {
    const { podMemberService } = await import('@modules/pods/podMember/podMember.service');
    await podMemberService.recordPaidJoin(String(pod._id), String(userId), paymentDocId);
  } catch (e) {
    console.warn('PodMember record failed', e);
  }
  try {
    const { evaluateBadgesForUser } = await import('@modules/engagement/badge/badge.service');
    evaluateBadgesForUser(String(userId), 'POD_JOIN').catch(() => {});
  } catch {
    /* noop */
  }
}

/** Post-success side effects shared by every gateway: book the pod, generate the
 * invoice PDF and email the receipt. The payment doc must already be SUCCESS with
 * an invoice number + paid_at set. Best-effort — failures here never fail payment. */
async function finalizePaidPayment(doc: IPayment, fs: any, methodLabel: string) {
  const pod = doc.pod_id ? await PodModel.findById(doc.pod_id) : null;
  await bookPodForPayment(pod, doc.user_id, String(doc._id));
  try {
    const pdf = await generateInvoicePdf({
      invoice_no: doc.invoice_no!,
      invoice_date: doc.paid_at!,
      customer_name: doc.user_name,
      customer_email: doc.user_email,
      customer_phone: doc.user_phone || undefined,
      business_name: fs.business_name,
      business_address: fs.business_address,
      business_gstin: fs.business_gstin,
      currency_symbol: fs.currency_symbol,
      items: [{ description: doc.description, qty: 1, unit_price: doc.subtotal, amount: doc.subtotal }],
      subtotal: doc.subtotal,
      platform_fee_amount: doc.platform_fee_amount,
      platform_fee_pct: doc.platform_fee_pct,
      gst_amount: doc.gst_amount,
      gst_pct: doc.gst_pct,
      total: doc.total,
      payment_id: doc.payment_id,
      payment_method: methodLabel,
      invoice_label: fs.invoice_label,
      invoice_support_email: fs.invoice_support_email,
      invoice_support_phone: fs.invoice_support_phone,
      invoice_footer_note: fs.invoice_footer_note,
      invoice_terms: fs.invoice_terms,
      invoice_logo_url: fs.invoice_logo_url,
    });
    const urlConfigs = await getUrlConfigs();
    await sendEmail({
      to: doc.user_email,
      subject: `Payment Receipt — ${doc.invoice_no}`,
      template: 'payment-receipt',
      vars: {
        name: doc.user_name,
        summary:
          pod && (pod as any).pod_date_time
            ? `${(pod as any).pod_title} — ${new Date((pod as any).pod_date_time).toLocaleString('en-IN')}`
            : doc.description,
        invoice_no: doc.invoice_no || '',
        payment_id: doc.payment_id,
        amount: `${fs.currency_symbol}${doc.total.toFixed(2)}`,
        app_url: urlConfigs.appUrl,
      },
      attachments: [
        {
          filename: `invoice-${doc.invoice_no!.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
  } catch (e) {
    console.warn('Receipt/invoice email failed', e);
  }
}

export const paymentService = {
  async list(filter?: { status?: string; user_id?: string; pod_id?: string; search?: string }, limit = 200) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    if (filter?.user_id) q.user_id = new Types.ObjectId(filter.user_id);
    if (filter?.pod_id) q.pod_id = new Types.ObjectId(filter.pod_id);
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ payment_id: r }, { invoice_no: r }, { user_name: r }, { user_email: r }];
    }
    const docs = await PaymentModel.find(q).sort({ created_at: -1 }).limit(limit);
    return docs.map(toPub);
  },

  async getById(id: string) {
    const d = await PaymentModel.findById(id);
    return d ? toPub(d) : null;
  },

  async listForUser(userId: string) {
    const docs = await PaymentModel.find({ user_id: new Types.ObjectId(userId) }).sort({
      created_at: -1,
    });
    return docs.map(toPub);
  },

  async dummyCheckout(input: any, userId: string) {
    const fs = await getFinanceSettings();
    if (!fs.dummy_mode) {
      throw new GraphQLError('Live payment gateway is not configured. Enable dummy mode to test.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    const { pod, payableAmount, description } = await resolvePayable(input);
    const { quote, originalTotal, couponCode, couponDiscount } = await applyCoupon(
      input,
      payableAmount,
      userId
    );

    const status = input.simulate_failure ? 'FAILED' : 'SUCCESS';
    const paidAt = status === 'SUCCESS' ? new Date() : null;
    const invoice_no = status === 'SUCCESS' ? await nextInvoiceNumber() : null;
    const contactPhone = `${input.contact_phone_extension} ${input.contact_phone_number}`.trim();

    const doc = await PaymentModel.create({
      payment_id: newPaymentId(),
      invoice_no,
      user_id: user._id,
      user_name: userDisplayName(user),
      user_email: input.contact_email,
      user_phone: contactPhone,
      billing_address: input.billing_address,
      checkout_url: input.checkout_url,
      target_type: input.pod_id ? 'POD' : 'OTHER',
      pod_id: input.pod_id ? new Types.ObjectId(input.pod_id) : null,
      description,
      subtotal: quote.subtotal,
      platform_fee_pct: quote.platform_fee_pct,
      platform_fee_amount: quote.platform_fee_amount,
      gst_pct: quote.gst_pct,
      gst_amount: quote.gst_amount,
      total: quote.total,
      currency_symbol: quote.currency_symbol,
      coupon_code: couponCode,
      coupon_discount: couponDiscount,
      status,
      gateway: 'DUMMY',
      gateway_ref: status === 'SUCCESS' ? `dummy_${Date.now()}` : null,
      paid_at: paidAt,
      metadata: { ...paymentMetadata(input, pod), original_total: originalTotal },
    });

    if (status === 'SUCCESS') {
      await finalizePaidPayment(doc, fs, 'Dummy Gateway');
      if (couponCode) await couponService.recordRedemption(couponCode);
    }
    return toPub(doc);
  },

  /** Step 1 of live checkout: create a Razorpay order + a PENDING payment row,
   * and return everything the client needs to open the Razorpay sheet. */
  async createRazorpayCheckout(input: any, userId: string) {
    const fs = await getFinanceSettings();
    const { keyId } = await getRazorpayKeys();
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    const { pod, payableAmount, description } = await resolvePayable(input);
    const { quote, originalTotal, couponCode, couponDiscount } = await applyCoupon(
      input,
      payableAmount,
      userId
    );
    const payment_id = newPaymentId();
    const contactPhone = `${input.contact_phone_extension} ${input.contact_phone_number}`.trim();
    const base = {
      payment_id,
      user_id: user._id,
      user_name: userDisplayName(user),
      user_email: input.contact_email,
      user_phone: contactPhone,
      billing_address: input.billing_address,
      checkout_url: input.checkout_url,
      target_type: input.pod_id ? 'POD' : 'OTHER',
      pod_id: input.pod_id ? new Types.ObjectId(input.pod_id) : null,
      description,
      subtotal: quote.subtotal,
      platform_fee_pct: quote.platform_fee_pct,
      platform_fee_amount: quote.platform_fee_amount,
      gst_pct: quote.gst_pct,
      gst_amount: quote.gst_amount,
      total: quote.total,
      currency_symbol: quote.currency_symbol,
      coupon_code: couponCode,
      coupon_discount: couponDiscount,
    };

    // 100%-off coupon → nothing to charge: finalize immediately, skip the gateway.
    if (quote.total <= 0) {
      const freeDoc = await PaymentModel.create({
        ...base,
        invoice_no: await nextInvoiceNumber(),
        status: 'SUCCESS',
        gateway: 'COUPON',
        gateway_ref: `coupon_${Date.now()}`,
        paid_at: new Date(),
        metadata: { ...paymentMetadata(input, pod), original_total: originalTotal },
      });
      await finalizePaidPayment(freeDoc, fs, 'Coupon (100% off)');
      if (couponCode) await couponService.recordRedemption(couponCode);
      return {
        payment_doc_id: String(freeDoc._id),
        key_id: keyId,
        order_id: '',
        amount: 0,
        currency: 'INR',
        name: fs.business_name,
        description,
        prefill_email: input.contact_email,
        prefill_contact: input.contact_phone_number,
        currency_symbol: quote.currency_symbol,
        total: 0,
        free: true,
        payment: toPub(freeDoc),
      };
    }

    const amountPaise = Math.round(quote.total * 100);
    const order = await createRazorpayOrder({
      amountPaise,
      currency: 'INR',
      receipt: payment_id,
      notes: { pod_id: input.pod_id || '', user_id: String(user._id) },
    });

    const doc = await PaymentModel.create({
      ...base,
      invoice_no: null,
      status: 'PENDING',
      gateway: 'RAZORPAY',
      gateway_ref: order.id,
      paid_at: null,
      metadata: { ...paymentMetadata(input, pod), original_total: originalTotal, razorpay_order_id: order.id },
    });

    return {
      payment_doc_id: String(doc._id),
      key_id: keyId,
      order_id: order.id,
      amount: amountPaise,
      currency: 'INR',
      name: fs.business_name,
      description,
      prefill_email: input.contact_email,
      prefill_contact: input.contact_phone_number,
      currency_symbol: quote.currency_symbol,
      total: quote.total,
      free: false,
      payment: null,
    };
  },

  /** Step 2 of live checkout: verify the signature, then finalize the payment. */
  async verifyRazorpayCheckout(input: any, userId: string) {
    const doc = await PaymentModel.findById(input.payment_doc_id);
    if (!doc) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
    if (String(doc.user_id) !== String(userId))
      throw new GraphQLError('Not your payment', { extensions: { code: 'FORBIDDEN' } });
    if (doc.gateway !== 'RAZORPAY' || doc.gateway_ref !== input.razorpay_order_id)
      throw new GraphQLError('Payment/order mismatch', { extensions: { code: 'BAD_USER_INPUT' } });
    if (doc.status === 'SUCCESS') return toPub(doc);

    const ok = await verifyRazorpaySignature({
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    });
    if (!ok) {
      doc.status = 'FAILED';
      await doc.save();
      throw new GraphQLError('Payment signature verification failed', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const fs = await getFinanceSettings();
    doc.status = 'SUCCESS';
    doc.paid_at = new Date();
    doc.invoice_no = await nextInvoiceNumber();
    doc.gateway_ref = input.razorpay_payment_id;
    (doc as any).metadata = {
      ...(doc as any).metadata,
      razorpay_order_id: input.razorpay_order_id,
      razorpay_payment_id: input.razorpay_payment_id,
    };
    await doc.save();
    await finalizePaidPayment(doc, fs, 'Razorpay');
    if (doc.coupon_code) await couponService.recordRedemption(doc.coupon_code);
    return toPub(doc);
  },

  async refund(paymentDocId: string, reason?: string) {
    const doc = await PaymentModel.findById(paymentDocId);
    if (!doc) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.status !== 'SUCCESS') {
      throw new GraphQLError('Only SUCCESS payments can be refunded', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    doc.status = 'REFUNDED';
    (doc as any).metadata = {
      ...((doc as any).metadata || {}),
      refund_reason: reason || null,
      refunded_at: new Date().toISOString(),
    };
    await doc.save();
    return toPub(doc);
  },

  async invoicePdfBase64(paymentDocId: string, requesterId: string, isAdmin: boolean) {
    const doc = await PaymentModel.findById(paymentDocId);
    if (!doc) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(doc.user_id) !== String(requesterId))
      throw new GraphQLError('Not your invoice', { extensions: { code: 'FORBIDDEN' } });
    if (!doc.invoice_no) {
      throw new GraphQLError('No invoice generated for this payment', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const fs = await getFinanceSettings();
    const pdf = await generateInvoicePdf({
      invoice_no: doc.invoice_no,
      invoice_date: doc.paid_at || doc.created_at,
      customer_name: doc.user_name,
      customer_email: doc.user_email,
      customer_phone: doc.user_phone || undefined,
      business_name: fs.business_name,
      business_address: fs.business_address,
      business_gstin: fs.business_gstin,
      currency_symbol: doc.currency_symbol,
      items: [
        {
          description: doc.description,
          qty: 1,
          unit_price: doc.subtotal,
          amount: doc.subtotal,
        },
      ],
      subtotal: doc.subtotal,
      platform_fee_amount: doc.platform_fee_amount,
      platform_fee_pct: doc.platform_fee_pct,
      gst_amount: doc.gst_amount,
      gst_pct: doc.gst_pct,
      total: doc.total,
      payment_id: doc.payment_id,
      payment_method: doc.gateway || 'Gateway',
      invoice_label: fs.invoice_label,
      invoice_support_email: fs.invoice_support_email,
      invoice_support_phone: fs.invoice_support_phone,
      invoice_footer_note: fs.invoice_footer_note,
      invoice_terms: fs.invoice_terms,
      invoice_logo_url: fs.invoice_logo_url,
    });
    return pdf.toString('base64');
  },
};
