jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@services/payout/product-invoice.pdf', () => ({
  generateProductInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));

import { Types } from 'mongoose';
import { sendProductInvoicesForPod } from '../../productInvoice.service';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendEmail } from '@services/email/email.service';
import { generateProductInvoicePdf } from '@services/payout/product-invoice.pdf';

const mockSend = sendEmail as jest.Mock;
const mockPdf = generateProductInvoicePdf as jest.Mock;

let seq = 0;

const financeSettings = {
  default_product_commission_pct: 5,
  currency_symbol: '₹',
  business_name: 'Duncit',
  business_address: '',
  business_gstin: '',
  invoice_logo_url: '',
  invoice_templates: {
    product: { label: 'PRODUCT INVOICE', terms: '', footer: '', note: '' },
  },
};

async function seedSeller(email: string | null) {
  return UserModel.create({
    auth: email ? { email } : {},
    profile: { first_name: 'Seller' },
  });
}

async function seedProduct(overrides: Record<string, unknown>) {
  return InventoryProductModel.create({
    product_name: `Product ${++seq}`,
    sku: `SKU-${seq}-${Date.now().toString(36).toUpperCase()}`,
    unit_cost: 100,
    ...overrides,
  });
}

beforeEach(() => {
  mockSend.mockClear();
  mockPdf.mockClear();
});

describe('sendProductInvoicesForPod (brand → product → default commission chain)', () => {
  it('does nothing for pods without product requests', async () => {
    await sendProductInvoicesForPod({ pod_title: 'Empty', product_requests: [] }, financeSettings);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('applies the brand override over the product pct and the global default', async () => {
    const seller = await seedSeller(`seller${++seq}@x.com`);
    const brand = await EcommBrandModel.create({
      owner_user_id: seller._id,
      brand_name: 'Override Brand',
      product_commission_pct: 20,
    });
    // Brand override (20%) beats the product's own 8%.
    const withBrand = await seedProduct({
      brand_id: brand._id,
      commission_pct: 8,
      listing_submitted_by_id: String(seller._id),
      listing_submitted_by_name: 'Seller',
    });
    // No brand → the product's own pct (8%).
    const productPct = await seedProduct({
      commission_pct: 8,
      listing_submitted_by_id: String(seller._id),
      listing_submitted_by_name: 'Seller',
    });

    const pod = {
      pod_title: 'Market Pod',
      product_requests: [
        { product_id: withBrand._id, product_name: 'A', quantity: 1, unit_cost: 100, total_cost: 100 },
        { product_id: productPct._id, product_name: 'B', quantity: 1, unit_cost: 100, total_cost: 100 },
        { product_id: new Types.ObjectId(), product_name: 'Ghost', quantity: 1, unit_cost: 10 }, // unknown → skipped
      ],
    };
    await sendProductInvoicesForPod(pod, financeSettings);

    expect(mockSend).toHaveBeenCalledTimes(1); // one seller bucket
    const pdfArgs = mockPdf.mock.calls[0][0];
    const lineA = pdfArgs.items.find((l: any) => l.name === 'A');
    const lineB = pdfArgs.items.find((l: any) => l.name === 'B');
    expect(lineA.commission_pct).toBe(20); // brand override wins
    expect(lineA.commission).toBe(20);
    expect(lineA.net).toBe(80);
    expect(lineB.commission_pct).toBe(8); // product pct
    expect(pdfArgs.gross_total).toBe(200);
    expect(pdfArgs.commission_total).toBe(28);
    expect(pdfArgs.net_total).toBe(172);
  });

  it('falls back to the global default and skips sellers without email', async () => {
    const noEmail = await seedSeller(null);
    // Legacy raw doc with commission_pct 0 (schema min is 5, so insert raw)
    // and no brand → global default 5% applies.
    const rawId = new Types.ObjectId();
    await InventoryProductModel.collection.insertOne({
      _id: rawId,
      product_name: 'Legacy',
      sku: `RAW-${Date.now().toString(36).toUpperCase()}`,
      unit_cost: 100,
      commission_pct: 0,
      brand_id: null,
      listing_submitted_by_id: String(noEmail._id),
      listing_submitted_by_name: 'NoMail',
    });

    await sendProductInvoicesForPod(
      {
        pod_title: 'Legacy Pod',
        product_requests: [{ product_id: rawId, product_name: 'Legacy', quantity: 2, unit_cost: 100 }],
      },
      financeSettings
    );
    // Seller has no email → invoice skipped entirely.
    expect(mockSend).not.toHaveBeenCalled();

    // Same product, seller WITH email → default 5% on gross 200 (qty fallback).
    const seller = await seedSeller(`seller${++seq}@x.com`);
    await InventoryProductModel.collection.updateOne(
      { _id: rawId },
      { $set: { listing_submitted_by_id: String(seller._id) } }
    );
    await sendProductInvoicesForPod(
      {
        pod_title: 'Legacy Pod',
        product_requests: [{ product_id: rawId, product_name: 'Legacy', quantity: 2, unit_cost: 100 }],
      },
      financeSettings
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    const pdfArgs = mockPdf.mock.calls[0][0];
    expect(pdfArgs.items[0].commission_pct).toBe(5);
    expect(pdfArgs.items[0].gross).toBe(200); // unit_cost × quantity fallback
    expect(pdfArgs.items[0].commission).toBe(10);
  });

  it('swallows per-seller failures (best-effort)', async () => {
    const seller = await seedSeller(`seller${++seq}@x.com`);
    const product = await seedProduct({
      commission_pct: 10,
      listing_submitted_by_id: String(seller._id),
      listing_submitted_by_name: 'Seller',
    });
    mockSend.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      sendProductInvoicesForPod(
        {
          pod_title: 'Flaky Pod',
          product_requests: [{ product_id: product._id, product_name: 'X', quantity: 1, unit_cost: 50, total_cost: 50 }],
        },
        financeSettings
      )
    ).resolves.toBeUndefined();
  });
});
