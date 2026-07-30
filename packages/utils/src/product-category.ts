/** Category matching between a club and a product, shared by every pod editor so
 * the product picker only offers products that belong to the pod's club category.
 * A club stores Super + Sub (its Sub lives in `category_id`; there is no middle
 * Category level on a club), so matching is at the Super + Sub level. Mirrors the
 * server gate in pod.service (and the native copy in the mobile app). */

export interface ClubCategoryKey {
  superId: string;
  subId: string;
}

/** The club's Super + Sub pair, or null when it lacks one (legacy clubs) or when
 * no club is picked yet. A club's Sub is stored in category_id.
 *
 * A null key means "this pod has no category", and every consumer below treats
 * that as matching NOTHING. It used to mean "no filter", which is how a pod
 * under a category-less club came to offer the entire catalogue. */
export function clubCategoryKey(club: any): ClubCategoryKey | null {
  if (!club) return null;
  const superId = club.super_category_id ? String(club.super_category_id) : '';
  const subId = club.category_id ? String(club.category_id) : '';
  if (!superId || !subId) return null;
  return { superId, subId };
}

/** A product matches a club when any of its category rows (or its flat legacy
 * fields) has the club's Super + Sub.
 *
 * A product carrying no category data at all does NOT match. That mirrors
 * `productMatchesClubCategory` in pod.service, which is the gate that actually
 * decides whether the pod saves: it has no such exemption, so offering these in
 * the picker only led the host to a "<product> does not belong to this pod's
 * category" failure at publish. Showing nothing is better than showing
 * something the save will reject. */
export function productMatchesClub(product: any, key: ClubCategoryKey | null): boolean {
  // No pod category => nothing to match against => nothing matches. The server
  // gate says the same, so the picker never offers what the save would reject.
  if (!key) return false;
  const target = `${key.superId}|${key.subId}`;
  const rows =
    Array.isArray(product?.categories) && product.categories.length > 0
      ? product.categories
      : [{ super_category_id: product?.super_category_id, sub_category_id: product?.sub_category_id }];
  return rows.some(
    (row: any) =>
      row?.super_category_id &&
      row?.sub_category_id &&
      `${String(row.super_category_id)}|${String(row.sub_category_id)}` === target,
  );
}

/** Filter the product picker options to those matching the selected club.
 *
 * A pod with no resolvable category offers NOTHING — the caller renders "No
 * products available for this category." That is deliberate: the alternative
 * (offering everything) let a badminton product be attached to an unrelated
 * pod, and the server rejects exactly what this now hides. */
export function filterProductsForClub(products: any[], club: any): any[] {
  const key = clubCategoryKey(club);
  if (!key) return [];
  return products.filter((product) => productMatchesClub(product, key));
}

/** Drop already-picked product rows that the current club no longer offers.
 *
 * The host can pick products on Step 4 and then change the club (or their host
 * category) on an earlier step. Without this the row survives, renders blank
 * because its option is gone, and publishing dies on the server's category
 * gate with no visible cause. Shared so mWeb, native and the portal pod-form
 * prune identically (rules 27 + 40).
 *
 * Returns the SAME array reference when nothing is dropped, so callers can use
 * it as an effect guard without looping. */
export function pruneProductRequests<T extends { product_id: string }>(
  requests: T[],
  availableProducts: { id: string }[],
): T[] {
  const offered = new Set(availableProducts.map((product) => String(product.id)));
  const kept = requests.filter((request) => offered.has(String(request.product_id)));
  return kept.length === requests.length ? requests : kept;
}
