import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { EcommBrandModel, type IEcommBrand } from './ecommBrand.model';
import {
  applyRazorpayInput,
  applyShiprocketInput,
  assertProvider,
  copyIntegration,
  integrationStatus,
  probeBrandIntegration,
  sameCredential,
  type BrandIntegrationProvider,
} from './ecommBrand.integrations';
import { PROVIDER_KEY, resetOwnShiprocketWarehouses } from './ecommBrand.service';
import { PartnerIntegrationModel, type IPartnerIntegration } from './partnerIntegration.model';

/**
 * The Partners console's Integrations page: the Razorpay and ShipRocket
 * accounts a brand partner saves once and picks for their brands.
 *
 * Every connection belongs to the signed-in partner (`owner_user_id`) and is
 * only ever read or written through that check. Secrets never leave the
 * server — the status reports `has_secret`, never the value.
 */

const LABEL_MAX = 60;
const PROVIDER_NAME: Record<BrandIntegrationProvider, string> = { SHIPROCKET: 'ShipRocket', RAZORPAY: 'Razorpay' };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

export interface PartnerIntegrationInput {
  label?: string | null;
  shiprocket?: Record<string, unknown> | null;
  razorpay?: Record<string, unknown> | null;
}

interface LinkedBrand {
  _id: Types.ObjectId;
  brand_name?: string;
  integration_links?: { shiprocket?: Types.ObjectId | null; razorpay?: Types.ObjectId | null } | null;
}

const linkField = (provider: BrandIntegrationProvider) => `integration_links.${PROVIDER_KEY[provider]}`;

const toPub = (doc: IPartnerIntegration, brands: LinkedBrand[]) => ({
  id: doc._id.toHexString(),
  provider: doc.provider,
  label: doc.label,
  status: integrationStatus(doc, doc.provider),
  brands: brands.map((b) => ({ id: b._id.toHexString(), brand_name: b.brand_name ?? '' })),
  created_at: doc.created_at ? doc.created_at.toISOString() : null,
  updated_at: doc.updated_at ? doc.updated_at.toISOString() : null,
});

/** The brands that use a connection — one read for the whole list, never one per row. */
async function brandsUsing(ownerId: Types.ObjectId, docs: IPartnerIntegration[]) {
  const ids = docs.map((d) => d._id);
  if (ids.length === 0) return [] as LinkedBrand[];
  return EcommBrandModel.find({
    owner_user_id: ownerId,
    $or: [{ 'integration_links.shiprocket': { $in: ids } }, { 'integration_links.razorpay': { $in: ids } }],
  })
    .select('brand_name integration_links')
    .lean<LinkedBrand[]>()
    .exec();
}

const usedBy = (doc: IPartnerIntegration, brands: LinkedBrand[]) =>
  brands.filter((b) => b.integration_links?.[PROVIDER_KEY[doc.provider]]?.equals(doc._id));

async function loadOwned(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) bad('Invalid integration');
  const doc = await PartnerIntegrationModel.findOne({ _id: id, owner_user_id: new Types.ObjectId(userId) });
  if (!doc) throw new GraphQLError('Integration not found', { extensions: { code: 'NOT_FOUND' } });
  return doc;
}

/** One account is saved once per partner — a second copy would drift from the first. */
async function assertNotDuplicate(doc: IPartnerIntegration) {
  const status = integrationStatus(doc, doc.provider);
  const others = await PartnerIntegrationModel.find({
    owner_user_id: doc.owner_user_id,
    provider: doc.provider,
    _id: { $ne: doc._id },
  });
  const twin = others.find((other) => integrationStatus(other, other.provider).identifier === status.identifier);
  if (twin) bad(`This ${PROVIDER_NAME[doc.provider]} account is already saved as "${twin.label}". Edit that one instead.`);
}

/**
 * Copy the connection onto every brand that uses it and save each one, so
 * `live` is re-derived and the change lands in the brand's change log. A
 * brand that ships on a ShipRocket account that just changed has its
 * warehouses registered again on the new one.
 */
async function refreshLinkedBrands(doc: IPartnerIntegration) {
  const brands = await EcommBrandModel.find({ owner_user_id: doc.owner_user_id, [linkField(doc.provider)]: doc._id });
  for (const brand of brands) {
    const accountChanged = doc.provider === 'SHIPROCKET' && !sameCredential(doc, brand, doc.provider);
    copyIntegration(doc, brand, doc.provider);
    await brand.save();
    if (accountChanged) await resetOwnShiprocketWarehouses(brand);
  }
  return brands.length;
}

/** What the page shows for one connection after a write: the doc and the brands using it. */
async function published(doc: IPartnerIntegration) {
  return toPub(doc, usedBy(doc, await brandsUsing(doc.owner_user_id, [doc])));
}

export const partnerIntegrationService = {
  /** The partner's saved connections, newest first, each with the brands that use it. */
  async listMine(userId: string, provider?: BrandIntegrationProvider | null) {
    if (provider) assertProvider(provider);
    const ownerId = new Types.ObjectId(userId);
    const docs = await PartnerIntegrationModel.find({ owner_user_id: ownerId, ...(provider ? { provider } : {}) })
      .sort({ created_at: -1 })
      .exec();
    const brands = await brandsUsing(ownerId, docs);
    return docs.map((doc) => toPub(doc, usedBy(doc, brands)));
  },

  /**
   * Add a connection (no id) or update one, and check it against the vendor
   * right away. A blank secret keeps the saved one. Every brand that uses the
   * connection is refreshed with the new credential and result.
   */
  async save(userId: string, id: string | null, provider: BrandIntegrationProvider, input: PartnerIntegrationInput) {
    assertProvider(provider);
    const label = str(input.label);
    if (!label) bad('Give this connection a name');
    if (label.length > LABEL_MAX) bad(`Keep the name under ${LABEL_MAX} characters`);
    const doc = id
      ? await loadOwned(userId, id)
      : new PartnerIntegrationModel({ owner_user_id: new Types.ObjectId(userId), provider });
    if (doc.provider !== provider) bad('A connection cannot change provider. Add a new one instead.');
    doc.label = label;
    if (provider === 'SHIPROCKET') applyShiprocketInput(doc, input.shiprocket ?? {});
    else applyRazorpayInput(doc, input.razorpay ?? {});
    await assertNotDuplicate(doc);
    await probeBrandIntegration(doc, provider);
    await doc.save();
    await refreshLinkedBrands(doc);
    return published(doc);
  },

  /** Check the saved credential again; the brands using it take the new answer. */
  async recheck(userId: string, id: string) {
    const doc = await loadOwned(userId, id);
    await probeBrandIntegration(doc, doc.provider);
    await doc.save();
    await refreshLinkedBrands(doc);
    return published(doc);
  },

  /** Delete a connection no brand uses. One in use is refused: the brand would be left on a key nobody can manage. */
  async remove(userId: string, id: string) {
    const doc = await loadOwned(userId, id);
    const inUse = usedBy(doc, await brandsUsing(doc.owner_user_id, [doc]));
    if (inUse.length > 0) {
      const names = inUse.map((b) => b.brand_name || 'Untitled brand').join(', ');
      bad(`In use by ${names}. Choose another connection on ${inUse.length === 1 ? 'that brand' : 'those brands'} first.`);
    }
    await doc.deleteOne();
    return true;
  },

  /**
   * Once: turn every credential a brand typed in before the Integrations page
   * existed into a saved connection of its owner, and link the brand to it.
   * The same account on two brands becomes ONE connection. Brands are linked
   * with a targeted update — their credential does not change, so neither
   * does `live`. Idempotent: a linked brand is never read again.
   */
  async backfillFromBrands() {
    let created = 0;
    let linked = 0;
    for (const provider of ['SHIPROCKET', 'RAZORPAY'] as const) {
      const key = PROVIDER_KEY[provider];
      const secretField = provider === 'SHIPROCKET' ? 'password' : 'key_secret';
      const brands = await EcommBrandModel.find({
        [linkField(provider)]: null,
        [`integrations.${key}.${secretField}`]: { $nin: ['', null] },
      }).exec();
      for (const brand of brands) {
        const connection = await connectionFor(brand, provider);
        if (connection.isNew) {
          await connection.save();
          created += 1;
        }
        const res = await EcommBrandModel.updateOne(
          { _id: brand._id, [linkField(provider)]: null },
          { $set: { [linkField(provider)]: connection._id } }
        );
        linked += res.modifiedCount;
      }
    }
    if (linked > 0) logs.server.info('ecommBrand', 'integrationBackfill', { created, linked });
    return { created, linked };
  },
};

/** The owner's saved connection holding exactly this brand's credential, or a new (unsaved) one copied from it. */
async function connectionFor(brand: IEcommBrand, provider: BrandIntegrationProvider) {
  const existing = await PartnerIntegrationModel.find({ owner_user_id: brand.owner_user_id, provider });
  const match = existing.find((doc) => sameCredential(doc, brand, provider));
  if (match) return match;
  const connection = new PartnerIntegrationModel({
    owner_user_id: brand.owner_user_id,
    provider,
    label: `${brand.brand_name || 'Brand'} ${PROVIDER_NAME[provider]}`.slice(0, LABEL_MAX),
  });
  copyIntegration(brand, connection, provider);
  return connection;
}
