import type { Types } from 'mongoose';
import {
  BrandPickupLocationModel,
  type IBrandPickupLocation,
} from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { brandPickupLocationService } from '@modules/venues/brandPickupLocation/brandPickupLocation.service';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { saveDuncitPickup, syncPickupLocations, type PickupInput } from '@modules/commerce/shiprocket/shiprocket.ops';
import { StoreProductModel } from './storeProduct.model';
import { badInput, notFound, toObjectId } from './store.shared';

/**
 * The warehouses behind the ShipRocket page.
 *
 * A pickup address belongs to the ShipRocket account — ours is a copy of it.
 * So the list is the account's own list (a sync takes in anything new), adding
 * one creates it on the account first and saves nothing if ShipRocket refuses,
 * and an address ShipRocket holds is changed and removed THERE, never here.
 *
 * Only the store's OWN (DUNCIT) warehouses appear here. A brand's warehouse is
 * the Products console's — it is approved, registered and corrected there — and
 * a row this console can neither edit nor delete is noise on the page it sits on.
 */

/** The same shape both consoles add a pickup address with (rule 34: one input, one path). */
export type StoreWarehouseInput = PickupInput;

/** Products (pet store and pod shop) shipping from each warehouse. */
async function productCounts(ids: Types.ObjectId[]): Promise<Map<string, number>> {
  const pipeline = [
    { $match: { pickup_location_id: { $in: ids } } },
    { $group: { _id: '$pickup_location_id', n: { $sum: 1 } } },
  ];
  const [store, pod] = await Promise.all([
    StoreProductModel.aggregate<{ _id: Types.ObjectId; n: number }>(pipeline),
    InventoryProductModel.aggregate<{ _id: Types.ObjectId; n: number }>(pipeline),
  ]);
  const counts = new Map<string, number>();
  for (const row of [...store, ...pod]) counts.set(String(row._id), (counts.get(String(row._id)) ?? 0) + row.n);
  return counts;
}

/** One of the store's own warehouses — a partner's is not ours to change. */
async function ownWarehouse(id: string): Promise<IBrandPickupLocation> {
  const oid = toObjectId(id);
  const doc = oid ? await BrandPickupLocationModel.findOne({ _id: oid, owner_kind: 'DUNCIT' }) : null;
  if (!doc) notFound('Warehouse not found');
  return doc;
}

export const storeWarehouseService = {
  /** The store's own warehouses against the ShipRocket account, with the products that ship from each. */
  async list() {
    const synced = await syncPickupLocations();
    const own = synced.warehouses.filter((row) => row.warehouse.owner_kind === 'DUNCIT');
    const counts = await productCounts(own.map((row) => row.warehouse._id as Types.ObjectId));
    return {
      ...synced,
      warehouses: own.map((row) => ({
        warehouse: brandPickupLocationService.toPub(row.warehouse),
        shiprocket_state: row.shiprocket_state,
        product_count: counts.get(String(row.warehouse._id)) ?? 0,
      })),
    };
  },

  /**
   * Add one of the store's pickup addresses. It is created on the ShipRocket
   * account and our row is written from what the account then holds, so a
   * warehouse here always means an address a courier can collect from.
   */
  async save(id: string | null | undefined, input: StoreWarehouseInput) {
    return brandPickupLocationService.toPub(await saveDuncitPickup(id, input));
  },

  /**
   * Delete a warehouse nothing ships from. One ShipRocket holds is not ours to
   * delete — their API cannot remove a pickup address, and the next sync would
   * simply take it back in — so it goes from ShipRocket first.
   */
  async remove(id: string) {
    const doc = await ownWarehouse(id);
    if (doc.shiprocket_registered) {
      badInput('ShipRocket holds this pickup address — remove it in ShipRocket, then sync');
    }
    const used = (await productCounts([doc._id as Types.ObjectId])).get(String(doc._id)) ?? 0;
    if (used > 0) badInput(`${used} product(s) ship from this warehouse — move them to another one first`);
    await doc.deleteOne();
    return true;
  },

  /** Put a warehouse ShipRocket does not have yet (a partner's, a legacy row) on the account. */
  register: (id: string) => brandPickupLocationService.registerWithShiprocket(id),
};
