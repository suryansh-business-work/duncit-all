import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { INDIAN_PINCODE, StoreServiceablePincodeModel } from './storeServiceablePincode.model';
import { badInput, iso, notFound, toObjectId } from './store.shared';

/**
 * The ecomm portal's Serviceable pincodes page: the list the storefront's
 * pincode check, the product delivery check and checkout read.
 */

/** A stored row as `.lean()` returns it. */
interface PincodeDoc {
  _id: unknown;
  pincode: string;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  is_active?: boolean | null;
  created_at?: Date | null;
}

/** `StoreServiceablePincodeInput` — cleaned below before it is stored. */
interface PincodeInput {
  pincode: string;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  is_active?: boolean | null;
}

const PINCODE_TABLE: TableEntityConfig = {
  searchFields: ['pincode', 'area', 'city', 'state'],
  sortFields: {
    pincode: 'pincode',
    area: 'area',
    city: 'city',
    state: 'state',
    is_active: 'is_active',
    created_at: 'created_at',
  },
  filterFields: {
    pincode: { type: 'string' },
    area: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    is_active: { type: 'boolean' },
    created_at: { type: 'date' },
  },
  defaultSort: { pincode: 1, _id: 1 },
};

const pincodeOut = (d: PincodeDoc) => ({
  id: String(d._id),
  pincode: d.pincode,
  area: d.area ?? '',
  city: d.city ?? '',
  state: d.state ?? '',
  is_active: d.is_active !== false,
  created_at: iso(d.created_at) ?? '',
});

const text = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 120) : '');

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

export const storeAdminPincodeService = {
  async table(query?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<PincodeDoc>(StoreServiceablePincodeModel, {}, query, PINCODE_TABLE);
    return { rows: docs.map(pincodeOut), total, page, page_size };
  },

  /** Create (no id) or update one pincode; the unique index refuses a pincode listed twice. */
  async save(id: string | null | undefined, input: PincodeInput) {
    const pincode = (input.pincode ?? '').replaceAll(/\D/g, '');
    if (!INDIAN_PINCODE.test(pincode)) badInput('Enter a valid 6-digit pincode');
    const fields = {
      pincode,
      area: text(input.area),
      city: text(input.city),
      state: text(input.state),
      is_active: input.is_active !== false,
    };
    try {
      if (!id) return pincodeOut((await StoreServiceablePincodeModel.create(fields)).toObject());
      const saved = await StoreServiceablePincodeModel.findByIdAndUpdate(
        toObjectId(id),
        { $set: fields },
        { new: true, runValidators: true }
      ).lean();
      if (!saved) notFound('Serviceable pincode not found');
      return pincodeOut(saved);
    } catch (error) {
      if (isDuplicateKey(error)) badInput(`Pincode ${pincode} is already in the list`);
      throw error;
    }
  },

  async remove(id: string) {
    const res = await StoreServiceablePincodeModel.deleteOne({ _id: toObjectId(id) });
    if (res.deletedCount === 0) notFound('Serviceable pincode not found');
    return true;
  },
};
