import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { BrandPickupLocationModel, type IBrandPickupLocation } from './brandPickupLocation.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';

const notFound = () =>
  new GraphQLError('Pickup location not found', { extensions: { code: 'NOT_FOUND' } });

const toPub = (d: IBrandPickupLocation) => ({
  id: String(d._id),
  owner_kind: d.owner_kind,
  brand_id: d.brand_id ? String(d.brand_id) : null,
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
