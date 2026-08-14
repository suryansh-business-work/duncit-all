import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { generateProductInvoicePdf, type ProductInvoiceLine } from '@services/payout/product-invoice.pdf';
import { nextInvoiceNumber } from './finance.model';
import { logs } from '@observability/log';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clampPct = (n: number) => Math.min(100, Math.max(0, Number(n) || 0));

interface SellerBucket {
  name: string;
  lines: ProductInvoiceLine[];
}

/** On pod completion, email each product seller an invoice for their products
 * sold on the pod (gross − Duncit commission = net payout). Best-effort. */
export async function sendProductInvoicesForPod(pod: any, fs: any) {
  const requests = pod.product_requests ?? [];
  if (!requests.length) return;

  // The invoice pays what was actually SOLD, at the prices buyers actually
  // paid: the pod's product orders carry the exact line items (variant pricing
  // included). The request's own quantity/total_cost is the STOCKED snapshot —
  // billing it paid sellers for units that never sold and went straight back
  // into their own sellable inventory.
  const orders = await ProductOrderModel.find({ pod_id: pod._id }).select('line_items').lean();
  const soldByProduct = new Map<string, { qty: number; gross: number }>();
  for (const order of orders) {
    for (const item of order.line_items ?? []) {
      const key = String(item.product_id);
      const prev = soldByProduct.get(key) ?? { qty: 0, gross: 0 };
      prev.qty += Number(item.qty) || 0;
      prev.gross += Number(item.gross) || 0;
      soldByProduct.set(key, prev);
    }
  }

  const productIds = requests.map((r: any) => r.product_id);
  const products = await InventoryProductModel.find({ _id: { $in: productIds } })
    .select('commission_pct brand_id listing_submitted_by_id listing_submitted_by_name')
    .lean();
  const byId = new Map(products.map((p: any) => [String(p._id), p]));

  // Brand-level commission overrides (Onboarded E-Commerce Brands): when set
  // (> 0) the brand's %% wins over the per-product pct and the global default.
  const brandIds = [...new Set(products.map((p: any) => String(p.brand_id ?? '')).filter(Boolean))];
  const brands = brandIds.length
    ? await EcommBrandModel.find({ _id: { $in: brandIds } }).select('product_commission_pct').lean()
    : [];
  const brandPctById = new Map(brands.map((b: any) => [String(b._id), b.product_commission_pct ?? 0]));

  const bySeller = new Map<string, SellerBucket>();
  for (const r of requests) {
    const p = byId.get(String(r.product_id));
    const sellerId = p?.listing_submitted_by_id;
    if (!sellerId) continue;
    // Nothing sold → nothing to pay out; the unsold reservation was released
    // back to the brand's sellable pool at completion.
    const sold = soldByProduct.get(String(r.product_id));
    if (!sold || sold.qty <= 0) continue;
    const brandPct = p.brand_id ? brandPctById.get(String(p.brand_id)) ?? 0 : 0;
    const commissionPct = clampPct(brandPct || p.commission_pct || fs.default_product_commission_pct);
    const gross = round2(sold.gross);
    const commission = round2((gross * commissionPct) / 100);
    const bucket: SellerBucket = bySeller.get(sellerId) ?? { name: p.listing_submitted_by_name || 'Seller', lines: [] };
    bucket.lines.push({
      name: r.product_name,
      qty: sold.qty,
      // The effective per-unit price buyers paid (variant prices can differ
      // from the request's base unit cost).
      unit_cost: round2(gross / sold.qty),
      gross,
      commission_pct: commissionPct,
      commission,
      net: round2(gross - commission),
    });
    bySeller.set(sellerId, bucket);
  }

  const tmpl = fs.invoice_templates.product;
  const cur = fs.currency_symbol;
  for (const [sellerId, bucket] of bySeller) {
    try {
      // The phone fields are selected because this seller now also gets a
      // WhatsApp: the funnel reads the number off this document, so a narrower
      // projection skips every send silently.
      const seller = await UserModel.findById(sellerId).select(
        'auth.email profile.first_name profile.last_name auth.phone communication.whatsapp'
      );
      const email = seller?.auth?.email;
      if (!email) continue;
      const name = [seller?.profile?.first_name, seller?.profile?.last_name].filter(Boolean).join(' ').trim() || bucket.name;
      const gross_total = round2(bucket.lines.reduce((s, l) => s + l.gross, 0));
      const commission_total = round2(bucket.lines.reduce((s, l) => s + l.commission, 0));
      const net_total = round2(gross_total - commission_total);
      const invoice_no = await nextInvoiceNumber();
      // One instant for both the PDF and the WhatsApp, so the seller cannot read
      // two different invoice dates for the same payout.
      const invoice_date = new Date();
      const pdf = await generateProductInvoicePdf({
        title: tmpl.label,
        invoice_no,
        invoice_date,
        pod_title: pod.pod_title,
        seller_name: name,
        seller_email: email,
        business_name: fs.business_name,
        business_address: fs.business_address,
        business_gstin: fs.business_gstin,
        currency_symbol: cur,
        items: bucket.lines,
        gross_total,
        commission_total,
        net_total,
        invoice_logo_url: fs.invoice_logo_url,
        invoice_terms: tmpl.terms,
        invoice_footer_note: tmpl.footer,
      });
      await sendEmail({
        to: email,
        subject: `${tmpl.label} · ${pod.pod_title}`,
        template: 'payout-statement',
        category: 'billing',
        vars: {
          name,
          pod_title: pod.pod_title,
          statement_type: 'product invoice',
          venue_bill: `${cur}${gross_total.toFixed(2)}`,
          gst_amount: `${cur}0.00`,
          duncit_label: 'Duncit Commission',
          duncit_amount: `${cur}${commission_total.toFixed(2)}`,
          payout_label: 'Your Payout',
          payout_amount: `${cur}${net_total.toFixed(2)}`,
          approval_type: 'FULL',
          reason: tmpl.note ?? '',
        },
        attachments: [
          {
            filename: `product-invoice-${invoice_no.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`,
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      });
      await whatsappService.send({
        event: 'ECOMM_PAYMENT_SENT',
        entityId: String(pod._id),
        user: seller,
        name,
        params: [
          name,
          bucket.lines.map((line) => line.name).join(', '),
          invoice_no,
          invoice_date.toLocaleString('en-IN', { dateStyle: 'medium' }),
          // The money template prints the rupee sign itself.
          net_total.toFixed(2),
        ],
      });
    } catch (e) {
      logs.server.warn('productInvoice', 'sendProductInvoicesForPod', {
        error: e,
        msg: 'failed',
        sellerId,
      });
    }
  }
}
