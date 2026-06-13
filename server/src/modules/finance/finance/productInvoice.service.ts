import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import { generateProductInvoicePdf, type ProductInvoiceLine } from '@services/payout/product-invoice.pdf';
import { nextInvoiceNumber } from './finance.model';

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

  const productIds = requests.map((r: any) => r.product_id);
  const products = await InventoryProductModel.find({ _id: { $in: productIds } })
    .select('commission_pct listing_submitted_by_id listing_submitted_by_name')
    .lean();
  const byId = new Map(products.map((p: any) => [String(p._id), p]));

  const bySeller = new Map<string, SellerBucket>();
  for (const r of requests) {
    const p = byId.get(String(r.product_id));
    const sellerId = p?.listing_submitted_by_id;
    if (!sellerId) continue;
    const commissionPct = clampPct(p.commission_pct || fs.default_product_commission_pct);
    const gross = round2(r.total_cost ?? Number(r.unit_cost || 0) * Number(r.quantity || 0));
    const commission = round2((gross * commissionPct) / 100);
    const bucket: SellerBucket = bySeller.get(sellerId) ?? { name: p.listing_submitted_by_name || 'Seller', lines: [] };
    bucket.lines.push({
      name: r.product_name,
      qty: r.quantity,
      unit_cost: r.unit_cost,
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
      const seller = await UserModel.findById(sellerId).select('auth.email profile.first_name profile.last_name');
      const email = seller?.auth?.email;
      if (!email) continue;
      const name = [seller?.profile?.first_name, seller?.profile?.last_name].filter(Boolean).join(' ').trim() || bucket.name;
      const gross_total = round2(bucket.lines.reduce((s, l) => s + l.gross, 0));
      const commission_total = round2(bucket.lines.reduce((s, l) => s + l.commission, 0));
      const net_total = round2(gross_total - commission_total);
      const invoice_no = await nextInvoiceNumber();
      const pdf = await generateProductInvoicePdf({
        title: tmpl.label,
        invoice_no,
        invoice_date: new Date(),
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
    } catch (e) {
      console.warn('[productInvoice] failed:', (e as Error).message);
    }
  }
}
