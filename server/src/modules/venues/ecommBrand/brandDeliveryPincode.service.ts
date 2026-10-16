import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { getBrandShiprocketAccount } from '@modules/commerce/shiprocket/shiprocket.account';
import { withShiprocketAccount } from '@modules/commerce/shiprocket/shiprocket.client';
import { getServiceability } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { EcommBrandModel } from './ecommBrand.model';
import { BRAND_PINCODE, BrandDeliveryPincodeModel, type IBrandDeliveryPincode } from './brandDeliveryPincode.model';

/** Most pincodes one paste may add — a CSV of a whole state still fits. */
const MAX_ADD = 2000;
/** Pincodes one Sync press checks; the rest wait for the next press. */
const SYNC_BATCH = 100;
/** Parallel ShipRocket lookups per sync (answers are cached per lane anyway). */
const SYNC_CONCURRENCY = 5;
/** The parcel a lane is probed with — the lightest slab couriers price. */
const PROBE_WEIGHT_KG = 0.5;

const badInput = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const PINCODE_TABLE: TableEntityConfig = {
  searchFields: ['pincode', 'courier_name'],
  sortFields: {
    pincode: 'pincode',
    serviceable: 'serviceable',
    checked_at: 'checked_at',
    created_at: 'created_at',
  },
  filterFields: {
    pincode: { type: 'string' },
    serviceable: { type: 'boolean' },
    checked_at: { type: 'date' },
  },
  defaultSort: { pincode: 1, _id: 1 },
};

type PincodeDoc = Pick<
  IBrandDeliveryPincode,
  'pincode' | 'serviceable' | 'courier_name' | 'etd' | 'checked_at' | 'sync_error' | 'created_at'
> & { _id: Types.ObjectId };

const pincodeOut = (d: PincodeDoc) => ({
  id: d._id.toHexString(),
  pincode: d.pincode,
  serviceable: d.serviceable ?? null,
  courier_name: d.courier_name ?? '',
  etd: d.etd ?? '',
  checked_at: d.checked_at ? new Date(d.checked_at).toISOString() : null,
  sync_error: d.sync_error ?? '',
  created_at: d.created_at ? new Date(d.created_at).toISOString() : null,
});

async function brandOid(brandId: string) {
  if (!Types.ObjectId.isValid(brandId)) badInput('Brand not found');
  const exists = await EcommBrandModel.exists({ _id: brandId });
  if (!exists) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
  return new Types.ObjectId(brandId);
}

/** The pincode a brand's parcels start from: its primary warehouse when that is
 * usable, else any approved, enabled warehouse of its own. */
async function brandOriginPincode(brandId: Types.ObjectId): Promise<string> {
  const usable = { owner_kind: 'BRAND', brand_id: brandId, review_status: 'APPROVED', is_active: { $ne: false } };
  const brand = await EcommBrandModel.findById(brandId).select('default_pickup_location_id').lean();
  const primary = brand?.default_pickup_location_id
    ? await BrandPickupLocationModel.findOne({ ...usable, _id: brand.default_pickup_location_id }).select('pincode').lean()
    : null;
  const warehouse = primary ?? (await BrandPickupLocationModel.findOne(usable).sort({ is_default: -1 }).select('pincode').lean());
  const pincode = warehouse?.pincode?.trim() ?? '';
  if (!BRAND_PINCODE.test(pincode)) {
    badInput('This brand needs an approved pickup address before its pincodes can be synced with ShipRocket');
  }
  return pincode;
}

/** Run `task` over `items`, at most `limit` at a time. */
function inBatches<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += limit) chunks.push(items.slice(i, i + limit));
  return chunks.reduce<Promise<void>>(
    (previous, chunk) => previous.then(() => Promise.all(chunk.map(task)).then(() => undefined)),
    Promise.resolve()
  );
}

export const brandDeliveryPincodeService = {
  async table(brandId: string, query?: TableQueryInput | null) {
    const scope = { brand_id: await brandOid(brandId) };
    const { docs, total, page, page_size } = await runTableQuery<PincodeDoc>(
      BrandDeliveryPincodeModel,
      scope,
      query,
      PINCODE_TABLE
    );
    return { rows: docs.map(pincodeOut), total, page, page_size };
  },

  /** Add pasted pincodes. Duplicates (already listed, or repeated in the paste)
   * are skipped and anything that is not a 6-digit PIN is reported back. */
  async add(brandId: string, pincodes: string[], user: AuthUser | null) {
    const brand_id = await brandOid(brandId);
    const cleaned = pincodes.map((p) => String(p ?? '').replaceAll(/\s/g, '')).filter(Boolean);
    if (cleaned.length === 0) badInput('Enter at least one pincode');
    if (cleaned.length > MAX_ADD) badInput(`Add at most ${MAX_ADD} pincodes at a time`);
    const invalid = [...new Set(cleaned.filter((p) => !BRAND_PINCODE.test(p)))];
    const wanted = [...new Set(cleaned.filter((p) => BRAND_PINCODE.test(p)))];
    const existing = new Set(
      (await BrandDeliveryPincodeModel.find({ brand_id, pincode: { $in: wanted } }).select('pincode').lean()).map(
        (d) => d.pincode
      )
    );
    const fresh = wanted.filter((p) => !existing.has(p));
    const created_by_id = user && Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : null;
    if (fresh.length > 0) {
      try {
        await BrandDeliveryPincodeModel.insertMany(
          fresh.map((pincode) => ({ brand_id, pincode, created_by_id })),
          { ordered: false }
        );
      } catch (error) {
        // A concurrent add of the same pincode hits the unique index — that row
        // exists either way. Anything else is a real failure.
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
    logs.server.info('brandDeliveryPincode', 'add', {
      brand_id: brandId,
      actor_id: user?.id ?? null,
      added: fresh.length,
      duplicates: wanted.length - fresh.length,
      invalid: invalid.length,
    });
    return { added: fresh.length, duplicates: wanted.length - fresh.length, invalid };
  },

  async remove(brandId: string, ids: string[], user: AuthUser | null) {
    const brand_id = await brandOid(brandId);
    const oids = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (oids.length === 0) return 0;
    const { deletedCount } = await BrandDeliveryPincodeModel.deleteMany({ brand_id, _id: { $in: oids } });
    logs.server.info('brandDeliveryPincode', 'remove', { brand_id: brandId, actor_id: user?.id ?? null, removed: deletedCount });
    return deletedCount;
  },

  /**
   * Check the least-recently-checked pincodes (never-checked first) against
   * ShipRocket from the brand's own warehouse, on the brand's own account. A
   * lane no courier serves is marked unserviceable, which takes the brand's
   * products out of the Pod Shop for buyers at that pincode.
   */
  async sync(brandId: string, user: AuthUser | null) {
    const brand_id = await brandOid(brandId);
    const pickupPincode = await brandOriginPincode(brand_id);
    // Refuses with what to fix when the brand has no usable ShipRocket account.
    const account = await getBrandShiprocketAccount(brand_id);
    const rows = await BrandDeliveryPincodeModel.find({ brand_id })
      .sort({ checked_at: 1, _id: 1 })
      .limit(SYNC_BATCH)
      .select('_id pincode');
    const tally = { checked: 0, serviceable: 0, unserviceable: 0, failed: 0 };
    await inBatches(rows, SYNC_CONCURRENCY, async (row) => {
      try {
        const quote = await withShiprocketAccount(account, () =>
          getServiceability({ pickupPincode, deliveryPincode: row.pincode, weightKg: PROBE_WEIGHT_KG })
        );
        await BrandDeliveryPincodeModel.updateOne(
          { _id: row._id },
          {
            serviceable: !!quote,
            courier_name: quote?.courier_name ?? '',
            etd: quote?.etd ?? '',
            checked_at: new Date(),
            sync_error: '',
          }
        );
        tally.checked += 1;
        if (quote) tally.serviceable += 1;
        else tally.unserviceable += 1;
      } catch (error) {
        // Keep the last known answer; stamp the attempt so the next press moves on.
        tally.failed += 1;
        await BrandDeliveryPincodeModel.updateOne(
          { _id: row._id },
          { checked_at: new Date(), sync_error: String((error as Error).message ?? 'Lookup failed').slice(0, 300) }
        );
        logs.server.warn('brandDeliveryPincode', 'sync', { error, brand_id: brandId, pincode: row.pincode });
      }
    });
    const total = await BrandDeliveryPincodeModel.countDocuments({ brand_id });
    const unchecked = await BrandDeliveryPincodeModel.countDocuments({ brand_id, checked_at: null });
    logs.server.info('brandDeliveryPincode', 'sync', { brand_id: brandId, actor_id: user?.id ?? null, ...tally });
    return { ...tally, total, unchecked };
  },

  /**
   * Brands that do NOT deliver to `pincode`: those with a pincode list that
   * lacks it, or lists it as unserviceable. Brands with no list deliver
   * everywhere and never appear here.
   */
  async brandsNotDeliveringTo(pincode: string): Promise<Types.ObjectId[]> {
    const restricted: Types.ObjectId[] = await BrandDeliveryPincodeModel.distinct('brand_id');
    if (restricted.length === 0) return [];
    const serving = new Set(
      (
        await BrandDeliveryPincodeModel.distinct('brand_id', { pincode, serviceable: { $ne: false } })
      ).map((id: Types.ObjectId) => id.toHexString())
    );
    return restricted.filter((id) => !serving.has(id.toHexString()));
  },

  /** Checkout guard: refuse shipped brand products whose brand does not
   * deliver to `pincode`, naming them so the buyer knows what to remove. */
  async assertShippedProductsDeliverTo(productIds: string[], pincode: string) {
    if (!BRAND_PINCODE.test(pincode)) return;
    const blocked = await this.brandsNotDeliveringTo(pincode);
    if (blocked.length === 0) return;
    const ids = productIds.filter((id) => Types.ObjectId.isValid(id));
    const refused = await InventoryProductModel.find({
      _id: { $in: ids },
      delivery_target: 'SHIPROCKET',
      brand_id: { $in: blocked },
    })
      .select('product_name')
      .lean();
    if (refused.length === 0) return;
    const names = refused.map((p) => p.product_name).join(', ');
    badInput(`${names} cannot be delivered to ${pincode}. Remove it or choose another delivery address.`);
  },
};
