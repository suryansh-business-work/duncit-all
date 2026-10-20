import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { logs } from '@observability/log';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { INDIAN_PINCODE, StoreServiceablePincodeModel } from './storeServiceablePincode.model';
import { StoreSettingsModel } from './storeSettings.model';
import { StoreHomeSectionModel } from './storeMerch.model';

/** The kinds after which the storefront used to slot the free-delivery strip on its own. */
const PRODUCT_KINDS = new Set(['COLLECTION_CAROUSEL', 'PRODUCT_SLIDER']);

/**
 * Sections got a `page` (HOME / DEALS) and the free-delivery strip became a
 * section the operator places. Blocks saved before that have no `page`: they
 * are the home page's, and on that page the storefront drew the strip after
 * the first product rail (else last). This writes exactly that: every legacy
 * block gets `page: HOME`, and one FREE_DELIVERY section lands where the strip
 * was — so the live store looks the same and the strip is now editable.
 *
 * Idempotent: it only acts while some block still has no `page`, and never adds
 * a second FREE_DELIVERY section.
 */
export async function migrateStoreSections() {
  const legacy = await StoreHomeSectionModel.find({ page: { $exists: false } })
    .select('kind sort_order')
    .sort({ sort_order: 1, _id: 1 })
    .lean();
  if (legacy.length === 0) return { sections_paged: 0, free_delivery_added: false };
  const hasStrip = await StoreHomeSectionModel.exists({ kind: 'FREE_DELIVERY' });
  let added = false;
  if (!hasStrip) {
    const firstRail = legacy.find((s) => PRODUCT_KINDS.has(s.kind));
    const at = firstRail ? firstRail.sort_order + 1 : (legacy.at(-1)?.sort_order ?? -1) + 1;
    await StoreHomeSectionModel.updateMany({ sort_order: { $gte: at } }, { $inc: { sort_order: 1 } });
    await StoreHomeSectionModel.create({ page: 'HOME', kind: 'FREE_DELIVERY', sort_order: at, is_active: true });
    added = true;
  }
  const paged = await StoreHomeSectionModel.updateMany({ page: { $exists: false } }, { $set: { page: 'HOME' } });
  return { sections_paged: paged.modifiedCount, free_delivery_added: added };
}

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

  // Runs with the catalogue repair so it rides the same boot step.
  const sections = await migrateStoreSections();
  if (sections.sections_paged > 0) logs.server.info('bootstrap', 'storeSections', sections);
  return { brands_named: writes.length, ...sections };
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
