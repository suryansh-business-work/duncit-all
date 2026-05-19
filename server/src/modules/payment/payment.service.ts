import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { PaymentModel, type IPayment } from './payment.model';
import { PodModel } from '../pod/pod.model';
import { UserModel } from '../user/user.model';
import { getFinanceSettings, nextInvoiceNumber } from '../finance/finance.model';
import { sendEmail } from '../../services/email/email.service';
import { generateInvoicePdf } from '../../services/invoice/invoice.pdf';
import { getUrlConfigs } from '../../config/url-configs';

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
    if (!input.amount || input.amount <= 0)
      throw new GraphQLError('Amount must be greater than 0', { extensions: { code: 'BAD_USER_INPUT' } });

    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    let pod: any = null;
    let description = input.description || 'Booking';
    if (input.pod_id) {
      pod = await PodModel.findById(input.pod_id);
      if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
      description = `Pod booking · ${pod.pod_title}`;
    }

    const quote = await computeQuote(input.amount);

    const status = input.simulate_failure ? 'FAILED' : 'SUCCESS';
    const paidAt = status === 'SUCCESS' ? new Date() : null;
    const invoice_no = status === 'SUCCESS' ? await nextInvoiceNumber() : null;
    const contactPhone = `${input.contact_phone_extension} ${input.contact_phone_number}`.trim();

    const doc = await PaymentModel.create({
      payment_id: newPaymentId(),
      invoice_no,
      user_id: user._id,
      user_name:
        [(user as any).first_name, (user as any).last_name].filter(Boolean).join(' ').trim() ||
        (user as any).email ||
        'Customer',
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
      status,
      gateway: 'DUMMY',
      gateway_ref: status === 'SUCCESS' ? `dummy_${Date.now()}` : null,
      paid_at: paidAt,
      metadata: {
        source: 'app_checkout',
        checkout_url: input.checkout_url,
        pod_id: input.pod_id || null,
      },
    });

    if (status === 'SUCCESS') {
      // Add user to pod attendees (slot booking) + record PodMember row
      if (pod) {
        try {
          if (!pod.pod_attendees.some((u: any) => String(u) === String(user._id))) {
            pod.pod_attendees.push(user._id as any);
            await pod.save();
          }
        } catch (e) {
           
          console.warn('Pod attendee update failed', e);
        }
        try {
          const { podMemberService } = await import('../podMember/podMember.service');
          await podMemberService.recordPaidJoin(String(pod._id), String(user._id), String(doc._id));
        } catch (e) {
          console.warn('PodMember record failed', e);
        }
        try {
          const { evaluateBadgesForUser } = await import('../badge/badge.service');
          evaluateBadgesForUser(String(user._id), 'POD_JOIN').catch(() => {});
        } catch {
          /* noop */
        }
      }

      // Generate invoice PDF + send receipt email
      try {
        const pdf = await generateInvoicePdf({
          invoice_no: invoice_no!,
          invoice_date: paidAt!,
          customer_name: doc.user_name,
          customer_email: doc.user_email,
          customer_phone: doc.user_phone || undefined,
          business_name: fs.business_name,
          business_address: fs.business_address,
          business_gstin: fs.business_gstin,
          currency_symbol: fs.currency_symbol,
          items: [
            {
              description,
              qty: 1,
              unit_price: quote.subtotal,
              amount: quote.subtotal,
            },
          ],
          subtotal: quote.subtotal,
          platform_fee_amount: quote.platform_fee_amount,
          platform_fee_pct: quote.platform_fee_pct,
          gst_amount: quote.gst_amount,
          gst_pct: quote.gst_pct,
          total: quote.total,
          payment_id: doc.payment_id,
          payment_method: 'Dummy Gateway',
        });
        const urlConfigs = await getUrlConfigs();

        await sendEmail({
          to: doc.user_email,
          subject: `Payment Receipt — ${invoice_no}`,
          template: 'payment-receipt',
          vars: {
            name: doc.user_name,
            summary: pod
              ? `${pod.pod_title} — ${new Date(pod.pod_date_time).toLocaleString('en-IN')}`
              : description,
            invoice_no: invoice_no || '',
            payment_id: doc.payment_id,
            amount: `${fs.currency_symbol}${quote.total.toFixed(2)}`,
            app_url: urlConfigs.appUrl,
          },
          attachments: [
            {
              filename: `invoice-${invoice_no!.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`,
              content: pdf,
              contentType: 'application/pdf',
            },
          ],
        });
      } catch (e) {
         
        console.warn('Receipt/invoice email failed', e);
      }
    }

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

  async invoicePdfBase64(paymentDocId: string) {
    const doc = await PaymentModel.findById(paymentDocId);
    if (!doc) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
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
    });
    return pdf.toString('base64');
  },
};
