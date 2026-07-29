/** Category matching between a club and a product, shared by every pod editor so
 * the product picker only offers products that belong to the pod's club category.
 * A club stores Super + Sub (its Sub lives in `category_id`; there is no middle
 * Category level on a club), so matching is at the Super + Sub level. Mirrors the
 * server gate in pod.service (and the native copy in the mobile app). */

export interface ClubCategoryKey {
  superId: string;
  subId: string;
}

/** The club's Super + Sub pair, or null when it lacks one (legacy clubs) — in
 * which case no product filter is applied. A club's Sub is stored in category_id. */
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
  if (!key) return true;
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

/** Filter the product picker options to those matching the selected club. */
export function filterProductsForClub(products: any[], club: any): any[] {
  const key = clubCategoryKey(club);
  if (!key) return products;
  return products.filter((product) => productMatchesClub(product, key));
}
