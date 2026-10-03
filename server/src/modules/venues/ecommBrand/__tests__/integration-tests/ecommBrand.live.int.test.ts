import { Types } from 'mongoose';
import { EcommBrandModel } from '../../ecommBrand.model';
import { ecommBrandService as svc } from '../../ecommBrand.service';
import { ecommBrandResolvers } from '../../ecommBrand.resolver';
import { makeContext } from '@test/harness';

/**
 * `live` is never written by hand: the model derives it on every save from the
 * status, the active switch and the integrations (or the one-off waiver the
 * startup backfill stamps on brands that were already selling).
 */

const CONNECTED = {
  shiprocket: { connected: true, email: 'api@acme.com', password: 'sr-secret' },
  razorpay: { connected: true, key_id: 'rzp_live_acme', key_secret: 'rzp-secret' },
};

let seq = 0;
const newBrand = (over: Record<string, unknown> = {}) =>
  EcommBrandModel.create({ owner_user_id: new Types.ObjectId(), brand_name: `Live Co ${++seq}`, ...over });

describe('the derived `live` flag (pre-save)', () => {
  it('a draft is not live and has no live_since', async () => {
    const draft = await newBrand({ integrations: CONNECTED });
    expect(draft.live).toBe(false);
    expect(draft.live_since).toBeNull();
  });

  it('an approved, active, connected brand is live from its first save, and stays stamped across unrelated edits', async () => {
    const brand = await newBrand({ status: 'APPROVED', integrations: CONNECTED });
    expect(brand.live).toBe(true);
    expect(brand.live_since).toBeInstanceOf(Date);
    const firstLive = Number(brand.live_since);

    brand.tagline = 'Now with a tagline';
    await brand.save();
    const stored = await EcommBrandModel.findById(brand._id).lean();
    expect(stored?.live).toBe(true);
    // Still the moment it went live, not the moment of the last edit.
    expect(Number(stored?.live_since)).toBe(firstLive);
  });

  it('pausing clears live_since; resuming stamps it again', async () => {
    const brand = await newBrand({ status: 'APPROVED', integrations: CONNECTED });
    const firstLive = Number(brand.live_since);

    brand.is_active = false;
    await brand.save();
    let stored = await EcommBrandModel.findById(brand._id).lean();
    expect(stored).toMatchObject({ live: false, live_since: null });

    brand.is_active = true;
    await brand.save();
    stored = await EcommBrandModel.findById(brand._id).lean();
    expect(stored?.live).toBe(true);
    expect(stored?.live_since).toBeInstanceOf(Date);
    expect(Number(stored?.live_since)).toBeGreaterThanOrEqual(firstLive);
  });

  it('an approved brand with integrations pending is not live until they are ready', async () => {
    const brand = await newBrand({ status: 'APPROVED', integrations: { razorpay: { connected: true } }, shipping_mode: 'OWN_SHIPROCKET' });
    expect(brand.live).toBe(false);

    brand.shipping_mode = 'DUNCIT_COURIER';
    await brand.save();
    expect((await EcommBrandModel.findById(brand._id).lean())?.live).toBe(true);
  });

  it('a waived brand is live without integrations, but never while un-approved', async () => {
    const waived = await newBrand({ status: 'APPROVED', integration_waived: true });
    expect(waived.live).toBe(true);

    waived.status = 'REJECTED';
    await waived.save();
    expect(await EcommBrandModel.findById(waived._id).lean()).toMatchObject({ live: false, live_since: null });
  });

  it('a hand-written `live` is overwritten by the rule', async () => {
    const draft = await newBrand();
    draft.live = true;
    draft.live_since = new Date('2020-01-01T00:00:00Z');
    await draft.save();
    expect(await EcommBrandModel.findById(draft._id).lean()).toMatchObject({ live: false, live_since: null });
  });
});

describe('ecommBrandService.backfillLive', () => {
  const approvedAt = new Date('2025-11-03T10:00:00.000Z');
  /** A brand stored before `live` existed — written past the model so no hook runs. */
  const insertLegacy = async (doc: Record<string, unknown>) => {
    const _id = new Types.ObjectId();
    await EcommBrandModel.collection.insertOne({
      _id,
      owner_user_id: new Types.ObjectId(),
      brand_name: `Legacy ${++seq}`,
      ...doc,
    } as never);
    return _id;
  };
  const read = (id: Types.ObjectId) => EcommBrandModel.findById(id).lean();

  it('keeps every selling brand selling, waives only those without integrations, and leaves the rest off', async () => {
    const sellingBare = await insertLegacy({ status: 'APPROVED', is_active: true, approved_at: approvedAt });
    const sellingConnected = await insertLegacy({ status: 'APPROVED', is_active: true, approved_at: approvedAt, integrations: CONNECTED });
    // is_active absent on a very old brand reads as active; no approved_at → stamped now.
    const sellingUndated = await insertLegacy({ status: 'APPROVED' });
    const paused = await insertLegacy({ status: 'APPROVED', is_active: false, approved_at: approvedAt });
    const draft = await insertLegacy({ status: 'DRAFT', integrations: CONNECTED });
    // Already carries `live` (saved by the new model): never touched.
    const modern = await newBrand({ status: 'APPROVED' });
    expect(modern.live).toBe(false);

    const before = Date.now();
    await expect(svc.backfillLive()).resolves.toEqual({ repaired: 5, waived: 2 });

    expect(await read(sellingBare)).toMatchObject({ live: true, integration_waived: true, live_since: approvedAt });
    expect(await read(sellingConnected)).toMatchObject({ live: true, integration_waived: false, live_since: approvedAt });
    const undated = await read(sellingUndated);
    expect(undated).toMatchObject({ live: true, integration_waived: true });
    expect(undated?.live_since?.getTime()).toBeGreaterThanOrEqual(before);
    expect(await read(paused)).toMatchObject({ live: false, integration_waived: false, live_since: null });
    expect(await read(draft)).toMatchObject({ live: false, integration_waived: false, live_since: null });
    expect(await read(modern._id)).toMatchObject({ live: false, integration_waived: false });
  });

  it('is idempotent: a second run repairs nothing and changes nothing', async () => {
    const selling = await insertLegacy({ status: 'APPROVED', is_active: true, approved_at: approvedAt });
    await svc.backfillLive();
    const once = await read(selling);

    await expect(svc.backfillLive()).resolves.toEqual({ repaired: 0, waived: 0 });
    expect(await read(selling)).toEqual(once);
  });

  it('the waiver survives later saves, so a backfilled brand is not pulled off the shop by an edit', async () => {
    const selling = await insertLegacy({ status: 'APPROVED', is_active: true, approved_at: approvedAt });
    await svc.backfillLive();

    const doc = await EcommBrandModel.findById(selling).orFail();
    doc.tagline = 'Edited after deploy';
    await doc.save();
    expect(await read(selling)).toMatchObject({ live: true, integration_waived: true, live_since: approvedAt });
  });
});

describe('the public brand card', () => {
  const PRIVATE = {
    contact_person: 'Asha Rao',
    contact_email: 'asha@acme.com',
    contact_phone: '9876543210',
    registered_business_name: 'Acme Co Pvt Ltd',
    gstin: '29AABCA1234F1ZP',
    pan: 'AABCA1234F',
    address_line1: '12 Market Street',
    postal_code: '411001',
    account_holder_name: 'Acme Co',
    account_number: '001122334455',
    ifsc_code: 'HDFC0001234',
    upi_id: 'acme@hdfc',
    reviewer_notes: 'GST verified by onboarding',
  };

  const seedFullBrand = () =>
    newBrand({
      ...PRIVATE,
      brand_name: 'Acme Public',
      tagline: 'Handmade at home',
      description: 'Decor made by hand.',
      logo_url: 'https://ik.imagekit.io/duncit/brands/acme.png',
      city: 'Pune',
      state: 'Maharashtra',
      website_url: 'https://acme.example',
      product_categories: ['Decor'],
      product_commission_pct: 12,
      documents: [{ type: 'GST certificate', url: 'https://ik.imagekit.io/duncit/brands/gst.pdf' }],
      tags: ['internal-tag'],
      shipping_mode: 'OWN_SHIPROCKET',
      default_pickup_location_id: new Types.ObjectId(),
      consent: { accepted: true, signed_name: 'Asha Rao', signed_at: new Date() },
      status: 'APPROVED',
      integration_waived: true,
      integrations: CONNECTED,
    });

  it('keeps what a buyer may see and blanks payout, tax, contact, commission and integrations', async () => {
    const brand = await seedFullBrand();
    const card = await svc.publicCard(String(brand._id));

    expect(card).toMatchObject({
      id: String(brand._id),
      brand_name: 'Acme Public',
      tagline: 'Handmade at home',
      description: 'Decor made by hand.',
      logo_url: 'https://ik.imagekit.io/duncit/brands/acme.png',
      city: 'Pune',
      state: 'Maharashtra',
      website_url: 'https://acme.example',
      product_categories: ['Decor'],
      status: 'APPROVED',
      live: true,
    });
    for (const field of Object.keys(PRIVATE)) {
      expect(card).toHaveProperty(field, '');
    }
    expect(card).toMatchObject({
      owner_user_id: '',
      product_commission_pct: 0,
      documents: [],
      tags: [],
      default_pickup_location_id: null,
      shipping_mode: null,
      integration_waived: false,
      consent: { accepted: false, signed_name: '', signed_at: null },
      integrations: {
        shiprocket: { connected: false, identifier: '', has_secret: false },
        razorpay: { connected: false, identifier: '', has_secret: false, live_mode: false },
      },
    });

    // Nothing private survives anywhere in the payload.
    const payload = JSON.stringify(card);
    for (const secret of [...Object.values(PRIVATE), 'api@acme.com', 'rzp_live_acme', String(brand.owner_user_id)]) {
      expect(payload).not.toContain(secret);
    }
  });

  it('returns null for a malformed or unknown id', async () => {
    expect(await svc.publicCard('not-an-id')).toBeNull();
    expect(await svc.publicCard(new Types.ObjectId().toHexString())).toBeNull();
  });

  it('publicEcommBrand serves the blanked card to any signed-in user and refuses the anonymous', async () => {
    const brand = await seedFullBrand();
    const Q = ecommBrandResolvers.Query as any;

    expect(() => Q.publicEcommBrand({}, { brand_doc_id: String(brand._id) }, makeContext(null))).toThrow(/authentication/i);

    const card = await Q.publicEcommBrand({}, { brand_doc_id: String(brand._id) }, makeContext({ roles: ['USER'] }));
    expect(card).toMatchObject({ brand_name: 'Acme Public', gstin: '', account_number: '', contact_email: '' });
  });
});
