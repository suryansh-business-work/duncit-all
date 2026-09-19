import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  BrandPickupLocationModel,
  type IBrandPickupLocation,
} from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { brandPickupLocationService } from '@modules/venues/brandPickupLocation/brandPickupLocation.service';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { pickupProblems } from '@modules/commerce/shiprocket/shiprocket.address';
import { importShiprocketPickup, syncPickupLocations } from '@modules/commerce/shiprocket/shiprocket.ops';
import { StoreProductModel } from './storeProduct.model';
import { badInput, notFound, toObjectId } from './store.shared';

/**
 * The warehouses behind the ShipRocket page: every pickup address matched
 * against the ShipRocket account, and the store's own (Duncit-owned)
 * warehouses added, corrected, removed, pushed to ShipRocket or brought in
 * from it. Partner warehouses are listed too — the account is one — but stay
 * the Products portal's to edit.
 */

export interface StoreWarehouseInput {
  nickname: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default?: boolean | null;
}

/** Letters, digits, spaces, dots, dashes and underscores — what ShipRocket takes as a pickup name. */
const NICKNAME = /^[\w .-]{2,60}$/;

const text = (v: unknown) => String(v ?? '').trim();

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

function cleanInput(input: StoreWarehouseInput) {
  const out = {
    nickname: text(input.nickname),
    contact_name: text(input.contact_name),
    phone: text(input.phone).replaceAll(/\D/g, '').slice(-10),
    email: text(input.email).toLowerCase(),
    address_line1: text(input.address_line1),
    address_line2: text(input.address_line2),
    city: text(input.city),
    state: text(input.state),
    pincode: text(input.pincode).replaceAll(/\D/g, ''),
    is_default: !!input.is_default,
  };
  if (!NICKNAME.test(out.nickname)) {
    badInput('Name the warehouse with 2–60 letters, digits, spaces, dots, dashes or underscores');
  }
  const problems = pickupProblems({ ...out, name: out.contact_name, line1: out.address_line1 });
  if (problems.length > 0) badInput(`Enter ${problems.join(' and ')}`);
  return out;
}

async function assertNicknameFree(nickname: string, selfId: string | null) {
  const key = nickname.toLowerCase();
  const all = await BrandPickupLocationModel.find({}).select('nickname').lean();
  if (all.some((w) => String(w._id) !== selfId && w.nickname.toLowerCase() === key)) {
    badInput(`A warehouse named "${nickname}" already exists`);
  }
}

/**
 * Push a warehouse to ShipRocket straight after it is saved. Best-effort by
 * contract — the save stands either way; the reason it did not land is on the
 * warehouse (`shiprocket_error`), which the page shows beside it.
 */
async function registerAfterSave(id: string) {
  try {
    await brandPickupLocationService.registerWithShiprocket(id);
  } catch (error) {
    logs.server.warn('store', 'registerWarehouse', { error, warehouse_id: id, msg: 'saved, not in ShipRocket yet' });
  }
}

export const storeWarehouseService = {
  /** Every warehouse against the ShipRocket account, with the products that ship from each. */
  async list() {
    const synced = await syncPickupLocations();
    const counts = await productCounts(synced.warehouses.map((row) => row.warehouse._id as Types.ObjectId));
    return {
      ...synced,
      warehouses: synced.warehouses.map((row) => ({
        warehouse: brandPickupLocationService.toPub(row.warehouse),
        shiprocket_state: row.shiprocket_state,
        product_count: counts.get(String(row.warehouse._id)) ?? 0,
      })),
    };
  },

  /**
   * Add or correct one of the store's warehouses, then push it to ShipRocket.
   * One ShipRocket already holds is changed there (its API cannot edit a
   * pickup address) and synced back, never edited here — the two would drift.
   */
  async save(id: string | null | undefined, input: StoreWarehouseInput) {
    const clean = cleanInput(input);
    if (id) {
      const doc = await ownWarehouse(id);
      if (doc.shiprocket_registered) badInput('This warehouse is in ShipRocket — change it there, then sync');
    }
    await assertNicknameFree(clean.nickname, id ?? null);
    const saved = await brandPickupLocationService.save(id, {
      ...clean,
      owner_kind: 'DUNCIT',
      brand_id: null,
      country: 'India',
      review_status: 'APPROVED',
    });
    await registerAfterSave(saved.id);
    return brandPickupLocationService.toPub(await ownWarehouse(saved.id));
  },

  /** Delete a warehouse nothing ships from any more. ShipRocket keeps its own copy. */
  async remove(id: string) {
    const doc = await ownWarehouse(id);
    const used = (await productCounts([doc._id as Types.ObjectId])).get(String(doc._id)) ?? 0;
    if (used > 0) badInput(`${used} product(s) ship from this warehouse — move them to another one first`);
    await doc.deleteOne();
    return true;
  },

  /** Add a warehouse (the store's or an approved partner's) to the ShipRocket account. */
  register: (id: string) => brandPickupLocationService.registerWithShiprocket(id),

  /** Make a warehouse of a pickup address that is on ShipRocket but not ours yet. */
  async importPickup(nickname: string) {
    return brandPickupLocationService.toPub(await importShiprocketPickup(text(nickname)));
  },
};
