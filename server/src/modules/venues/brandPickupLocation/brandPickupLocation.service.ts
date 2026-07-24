import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { BrandPickupLocationModel, type IBrandPickupLocation } from './brandPickupLocation.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';

const notFound = () =>
  new GraphQLError('Pickup location not found', { extensions: { code: 'NOT_FOUND' } });

/** Load a brand owned by the signed-in partner (404 otherwise) — the ownership
 * gate for every myBrandPickupLocation* op. */
async function loadOwnedBrand(userId: string, brandId: string) {
  if (!Types.ObjectId.isValid(brandId)) {
    throw new GraphQLError('Invalid brand', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const brand = await EcommBrandModel.findOne({
    _id: brandId,
    owner_user_id: new Types.ObjectId(userId),
  }).select('_id');
  if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
  return brand;
}

/** Load a warehouse that belongs to the given brand (404 otherwise). */
async function ownedLocation(brandId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const doc = await BrandPickupLocationModel.findOne({
    _id: id,
    owner_kind: 'BRAND',
    brand_id: new Types.ObjectId(brandId),
  });
  if (!doc) throw notFound();
  return doc;
}

const isDuplicateKeyError = (error: unknown) =>
  !!error && typeof error === 'object' && (error as { code?: number }).code === 11000;

const REVIEW_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);

const toPub = (d: IBrandPickupLocation) => ({
  id: String(d._id),
  owner_kind: d.owner_kind,
  brand_id: d.brand_id ? String(d.brand_id) : null,
  review_status: d.review_status ?? 'APPROVED',
  nickname: d.nickname,
  contact_name: d.contact_name,
  phone: d.phone,
  email: d.email,
  address_line1: d.address_line1,
  address_line2: d.address_line2,
  city: d.city,
  state: d.state,
  pincode: d.pincode,
  country: d.country,
  is_default: d.is_default,
  shiprocket_registered: d.shiprocket_registered,
  shiprocket_pickup_id: d.shiprocket_pickup_id,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

async function clearOtherDefaults(owner_kind: string, brand_id: Types.ObjectId | null, keepId?: string) {
  const q: any = { owner_kind, is_default: true };
  q.brand_id = brand_id ?? null;
  if (keepId) q._id = { $ne: new Types.ObjectId(keepId) };
  await BrandPickupLocationModel.updateMany(q, { $set: { is_default: false } });
}

/** Point the owning brand's default_pickup_location_id at this location. */
async function syncBrandDefault(doc: IBrandPickupLocation) {
  if (doc.owner_kind === 'BRAND' && doc.brand_id && doc.is_default) {
    await EcommBrandModel.updateOne(
      { _id: doc.brand_id },
      { $set: { default_pickup_location_id: doc._id } }
    );
  }
}

export const brandPickupLocationService = {
  toPub,

  async list(filter?: { owner_kind?: string; brand_id?: string | null }) {
    const q: any = {};
    if (filter?.owner_kind) q.owner_kind = filter.owner_kind;
    if (filter?.brand_id && Types.ObjectId.isValid(filter.brand_id)) {
      q.brand_id = new Types.ObjectId(filter.brand_id);
    }
    const docs = await BrandPickupLocationModel.find(q).sort({ is_default: -1, nickname: 1 });
    return docs.map(toPub);
  },

  async save(id: string | null | undefined, input: any) {
    const brandId =
      input.brand_id && Types.ObjectId.isValid(input.brand_id) ? new Types.ObjectId(input.brand_id) : null;
    const fields = {
      owner_kind: input.owner_kind === 'DUNCIT' ? 'DUNCIT' : 'BRAND',
      brand_id: brandId,
      nickname: String(input.nickname ?? '').trim(),
      contact_name: String(input.contact_name ?? '').trim(),
      phone: String(input.phone ?? '').trim(),
      email: String(input.email ?? '').trim(),
      address_line1: String(input.address_line1 ?? '').trim(),
      address_line2: String(input.address_line2 ?? '').trim(),
      city: String(input.city ?? '').trim(),
      state: String(input.state ?? '').trim(),
      pincode: String(input.pincode ?? '').trim(),
      country: String(input.country ?? 'India').trim(),
      is_default: !!input.is_default,
      // Admin/Duncit saves default to APPROVED; partner saves force PENDING.
      review_status: REVIEW_STATUSES.has(input.review_status) ? input.review_status : 'APPROVED',
    };
    let doc: IBrandPickupLocation | null;
    if (id) {
      doc = await BrandPickupLocationModel.findByIdAndUpdate(id, { $set: fields }, { new: true });
      if (!doc) throw notFound();
    } else {
      doc = await BrandPickupLocationModel.create(fields);
    }
    if (doc.is_default) {
      await clearOtherDefaults(doc.owner_kind, doc.brand_id, String(doc._id));
      await syncBrandDefault(doc);
    }
    return toPub(doc);
  },

  async remove(id: string) {
    const res = await BrandPickupLocationModel.findByIdAndDelete(id);
    return !!res;
  },

  async setDefault(id: string) {
    const doc = await BrandPickupLocationModel.findById(id);
    if (!doc) throw notFound();
    await clearOtherDefaults(doc.owner_kind, doc.brand_id, String(doc._id));
    doc.is_default = true;
    await doc.save();
    await syncBrandDefault(doc);
    return toPub(doc);
  },

  /* ---- Partner-scoped ops (brand ownership asserted; owner_kind/brand_id are
   * forced server-side). ShipRocket registration stays admin-only — a partner
   * warehouse uses the manual delivery_charge until an admin registers it. ---- */

  async listMine(userId: string, brandDocId: string) {
    await loadOwnedBrand(userId, brandDocId);
    return this.list({ owner_kind: 'BRAND', brand_id: brandDocId });
  },

  async saveMine(userId: string, brandDocId: string, id: string | null | undefined, input: any) {
    await loadOwnedBrand(userId, brandDocId);
    if (id) await ownedLocation(brandDocId, id);
    try {
      // Partner warehouses are gated: saved as PENDING and blocked from product
      // use until a Products Manager approves the raised request.
      const saved = await this.save(id, {
        ...input,
        owner_kind: 'BRAND',
        brand_id: brandDocId,
        review_status: 'PENDING',
      });
      const { approvalService } = await import('@modules/approval/approval.service');
      await approvalService.submitWarehouseApproval(saved.id, saved.nickname, !!id, userId);
      return saved;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new GraphQLError('A warehouse with this nickname already exists', {
          extensions: { code: 'CONFLICT' },
        });
      }
      throw error;
    }
  },

  async removeMine(userId: string, brandDocId: string, id: string) {
    await loadOwnedBrand(userId, brandDocId);
    const doc = await ownedLocation(brandDocId, id);
    // Reference guard: a warehouse still shipping products cannot be deleted.
    const referenced = await InventoryProductModel.countDocuments({ pickup_location_id: doc._id });
    if (referenced > 0) {
      throw new GraphQLError(
        `This warehouse is used by ${referenced} product(s) — move them to another warehouse first`,
        { extensions: { code: 'BAD_REQUEST' } }
      );
    }
    return this.remove(id);
  },

  async setDefaultMine(userId: string, brandDocId: string, id: string) {
    await loadOwnedBrand(userId, brandDocId);
    await ownedLocation(brandDocId, id);
    return this.setDefault(id);
  },

  async registerWithShiprocket(id: string) {
    const doc = await BrandPickupLocationModel.findById(id);
    if (!doc) throw notFound();
    const { addPickupLocation } = await import('@modules/commerce/shiprocket/shiprocket.gateway');
    const result = await addPickupLocation({
      pickup_location: doc.nickname,
      name: doc.contact_name || doc.nickname,
      email: doc.email,
      phone: doc.phone.replace(/\D/g, '').slice(-10),
      address: doc.address_line1,
      address_2: doc.address_line2,
      city: doc.city,
      state: doc.state,
      country: doc.country || 'India',
      pin_code: doc.pincode,
    });
    doc.shiprocket_registered = result.registered;
    doc.shiprocket_pickup_id = result.pickup_id;
    await doc.save();
    return toPub(doc);
  },
};
