import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';

/**
 * Catalogue repairs the pet store depends on. Idempotent: each step only fills
 * a value that is empty, so running it on every boot changes nothing twice.
 *
 * - MRP moved from the store listing (`store.mrp`) to the catalogue
 *   (`mrp` / `variants.mrp`) so the Products portal, the Partners app and the
 *   store all read one number. A listing MRP is copied onto a product that has
 *   none of its own.
 * - `brand_name` is copied from the brand record onto products that carry only
 *   the brand id — they read blank in the Products table and on the store's
 *   Brand filter.
 *
 * Packaging needs no data step: existing products keep their values (0 where
 * never entered) and `packagingMissing` flags them as "Missing packaging".
 */
export async function migrateStoreCatalogue() {
  const mrp = await InventoryProductModel.collection.updateMany(
    { 'store.mrp': { $gt: 0 }, $or: [{ mrp: { $exists: false } }, { mrp: 0 }] },
    [{ $set: { mrp: '$store.mrp' } }]
  );

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

  return { mrp_copied: mrp.modifiedCount, brands_named: writes.length };
}
