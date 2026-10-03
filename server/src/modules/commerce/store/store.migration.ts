import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { INDIAN_PINCODE, StoreServiceablePincodeModel } from './storeServiceablePincode.model';
import { StoreSettingsModel } from './storeSettings.model';

/**
 * Catalogue repairs the pet store depends on. Idempotent: each step only fills
 * a value that is empty, so running it on every boot changes nothing twice.
 *
 * - `brand_name` is copied from the brand record onto products that carry only
 *   the brand id — they read blank in the Products table and on the store's
 *   Brand filter.
 *
 * Packaging needs no data step: existing products keep their values (0 where
 * never entered) and `packagingMissing` flags them as "Missing packaging".
 */
export async function migrateStoreCatalogue() {
  const unnamed = await InventoryProductModel.find({
    brand_id: { $ne: null },
    $or: [{ brand_name: '' }, { brand_name: { $exists: false } }],
  })
    .select('brand_id')
    .lean();
  const brands = await EcommBrandModel.find({ _id: { $in: unnamed.map((p) => p.brand_id) } })
    .select('brand_name')
    .lean();
  const nameOf = new Map(brands.map((b) => [String(b._id), b.brand_name]));
  const writes = unnamed
    .filter((p) => nameOf.get(String(p.brand_id)))
    .map((p) => ({
      updateOne: { filter: { _id: p._id }, update: { $set: { brand_name: nameOf.get(String(p.brand_id)) } } },
    }));
  if (writes.length > 0) await InventoryProductModel.bulkWrite(writes);

  return { brands_named: writes.length };
}

/**
 * Moves the pincode list once typed into Settings › Shipping into the
 * Serviceable pincodes collection, active, then empties the old field — so an
 * operator who later deletes a pincode does not see it come back on the next
 * boot. Only a list that was switched on is moved: one that was never in
 * force would otherwise start limiting delivery the day this ships. Upserts
 * never overwrite a row the operator already edited.
 */
export async function migrateServiceablePincodes() {
  const settings = await StoreSettingsModel.findOne({ singleton_key: 'store' })
    .select('serviceable_pincodes serviceable_pincodes_enabled')
    .lean();
  const legacy = settings?.serviceable_pincodes ?? [];
  if (!settings?.serviceable_pincodes_enabled || legacy.length === 0) return { pincodes_moved: 0 };
  const pincodes = [...new Set(legacy.map((p) => String(p).trim()).filter((p) => INDIAN_PINCODE.test(p)))];
  if (pincodes.length > 0) {
    await StoreServiceablePincodeModel.bulkWrite(
      pincodes.map((pincode) => ({
        updateOne: { filter: { pincode }, update: { $setOnInsert: { pincode, is_active: true } }, upsert: true },
      })),
      { ordered: false }
    );
  }
  await StoreSettingsModel.updateOne(
    { singleton_key: 'store' },
    { $set: { serviceable_pincodes: [], serviceable_pincodes_enabled: false } }
  );
  return { pincodes_moved: pincodes.length };
}
