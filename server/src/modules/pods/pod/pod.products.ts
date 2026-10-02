/**
 * Pod product requests and club-category rules: the category minimum-pax
 * gate, product eligibility, building a pod's product requests and applying
 * inventory deltas when they change.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { availableOf, notifyStockCrossings } from '@modules/venues/inventory/inventory.service';

const requestMap = (items: any[] = []) => {
  const map = new Map<string, number>();
  for (const item of items) {
    const productId = String(item.product_id);
    map.set(productId, (map.get(productId) ?? 0) + (Number(item.quantity) || 0));
  }
  return map;
};

type ClubCategory = {
  super_category_id: string | null;
  // A club stores its Sub-category in `category_id` (2-level Super + Sub model;
  // the middle Category level is not persisted on a club).
  sub_category_id: string | null;
};

/** The pod's category is its club's Super + Sub. Null when the club has no full
 * pair yet (legacy clubs) — which imposes no product constraint. */
export async function resolveClubCategory(
  clubId: Types.ObjectId | string | null | undefined
): Promise<ClubCategory | null> {
  if (!clubId || !Types.ObjectId.isValid(String(clubId))) return null;
  const club = await ClubModel.findById(String(clubId))
    .select('super_category_id category_id')
    .lean();
  if (!club) return null;
  return {
    super_category_id: club.super_category_id ? String(club.super_category_id) : null,
    sub_category_id: club.category_id ? String(club.category_id) : null,
  };
}

/**
 * The pod's sub-category can set the fewest people the activity needs — a
 * doubles game needs 4, so a 2-spot pod under it is not a real game. Enforced
 * here, not just in the host's slider, so no client can size a pod below it.
 * `min_pax` 0 (the default for every existing sub-category) imposes nothing.
 */
export async function assertMeetsMinPax(clubCategory: ClubCategory | null, noOfSpots: number) {
  const subCategoryId = clubCategory?.sub_category_id;
  if (!subCategoryId) return;
  const sub = await CategoryModel.findById(subCategoryId).select('min_pax').lean();
  const minPax = sub?.min_pax ?? 0;
  if (minPax > 0 && noOfSpots < minPax) {
    throw new GraphQLError(
      `This activity needs at least ${minPax} people — increase the number of spots`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
}

/** A product may attach to a pod only when one of its category rows (or its flat
 * legacy fields) matches the pod's club at the Super + Sub level.
 *
 * FAILS CLOSED. A pod whose club carries no category pair has nothing to match
 * against, so it accepts NO products. This used to return true, which meant any
 * caller pointing at a category-less club — or at a club_id that does not
 * resolve at all — could attach a product from any category through the API.
 * Mirrors `productMatchesClub` in @duncit/utils, which hides the same set in the
 * picker so the client never offers what this rejects. */
function productMatchesClubCategory(product: any, clubCategory: ClubCategory | null): boolean {
  if (!clubCategory?.super_category_id || !clubCategory?.sub_category_id) {
    return false;
  }
  const target = `${clubCategory.super_category_id}|${clubCategory.sub_category_id}`;
  const rows = Array.isArray(product.categories) && product.categories.length > 0
    ? product.categories
    : [{ super_category_id: product.super_category_id, sub_category_id: product.sub_category_id }];
  return rows.some(
    (row: any) =>
      row.super_category_id &&
      row.sub_category_id &&
      `${String(row.super_category_id)}|${String(row.sub_category_id)}` === target
  );
}

export async function buildProductRequests(
  enabled: boolean,
  rawItems: any[] = [],
  clubCategory: ClubCategory | null = null,
  previousItems: any[] = []
) {
  if (!enabled) return [];
  // Sales already made against this pod survive an edit — carry sold_count over.
  const soldByProduct = new Map<string, number>(
    (previousItems ?? []).map((row: any) => [String(row.product_id), Number(row.sold_count ?? 0)])
  );
  const compact = Array.from(requestMap(rawItems).entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((item) => item.quantity > 0);
  // Nothing can be matched against a pod that has no category, so say THAT
  // rather than blaming each product for not belonging to a category the pod
  // never had. Reached when the club carries no Super+Sub pair, or when the
  // club_id does not resolve to a club at all.
  if (compact.length > 0 && (!clubCategory?.super_category_id || !clubCategory?.sub_category_id)) {
    throw new GraphQLError("This pod's club has no category, so no products can be attached to it", {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const next = [];
  for (const item of compact) {
    const product = await InventoryProductModel.findById(item.productId);
    if (!product?.is_active) {
      throw new GraphQLError('Selected product is not available', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (!productMatchesClubCategory(product, clubCategory)) {
      throw new GraphQLError(`${product.product_name} does not belong to this pod's category`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    next.push({
      product_id: product._id,
      product_name: product.product_name,
      image_url: product.image_url ?? '',
      images: Array.isArray(product.images) ? product.images : [],
      unit_cost: product.unit_cost,
      quantity: item.quantity,
      sold_count: soldByProduct.get(String(product._id)) ?? 0,
      total_cost: product.unit_cost * item.quantity,
    });
  }
  return next;
}

export async function applyProductDeltas(oldItems: any[], nextItems: any[]) {
  const oldMap = requestMap(oldItems);
  const nextMap = requestMap(nextItems);
  const productIds = Array.from(new Set([...oldMap.keys(), ...nextMap.keys()]));
  for (const productId of productIds) {
    const delta = (nextMap.get(productId) ?? 0) - (oldMap.get(productId) ?? 0);
    if (!delta) continue;
    const product = await InventoryProductModel.findById(productId);
    if (!product) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    if (delta > 0 && product.inventory_count - product.requested_count < delta) {
      throw new GraphQLError(`Not enough inventory for ${product.product_name}`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    // Reserving units for a pod takes them out of the sellable pool, so it is a
    // stock crossing like any other — this is where a brand's last units go
    // when the shop never sold one of them.
    const beforeAvailable = availableOf(product);
    product.requested_count = Math.max(0, product.requested_count + delta);
    await product.save();
    await notifyStockCrossings(product, beforeAvailable);
  }
}

/** Re-prices the pod's product requests and moves the reserved inventory counts. */
export async function applyProductsForUpdate(doc: any, input: any) {
  if (input.products_enabled === undefined && input.product_requests === undefined) return;
  const productsEnabled = input.products_enabled ?? doc.products_enabled;
  const clubCategory = await resolveClubCategory(input.club_id ?? doc.club_id);
  const nextRequests = await buildProductRequests(
    !!productsEnabled,
    input.product_requests ?? doc.product_requests ?? [],
    clubCategory,
    doc.product_requests ?? []
  );
  await applyProductDeltas(doc.product_requests ?? [], nextRequests);
  doc.products_enabled = !!productsEnabled;
  doc.product_requests = nextRequests as any;
  doc.product_cost_total = nextRequests.reduce((sum, item) => sum + item.total_cost, 0);
}
