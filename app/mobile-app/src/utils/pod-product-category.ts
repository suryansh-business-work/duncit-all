/** Club ⇄ product category matching for the pod product picker. A native mirror
 * of @duncit/utils `product-category` (the web package pulls DOM-only helpers, so
 * it can't be imported into the RN bundle). A club stores Super + Sub (its Sub
 * lives in `category_id`; there is no middle Category level on a club), so
 * matching is at the Super + Sub level, identical to the server gate and mWeb. */

export interface ClubCategoryKey {
  superId: string;
  subId: string;
}

/** The club's Super + Sub pair, or null when it lacks one (legacy clubs). */
export function clubCategoryKey(club: any): ClubCategoryKey | null {
  if (!club) return null;
  const superId = club.super_category_id ? String(club.super_category_id) : '';
  const subId = club.category_id ? String(club.category_id) : '';
  if (!superId || !subId) return null;
  return { superId, subId };
}

const hasCategoryData = (product: any): boolean =>
  (Array.isArray(product?.categories) && product.categories.length > 0) ||
  Boolean(product?.super_category_id && product?.sub_category_id);

/** A product matches a club when any of its category rows (or its flat legacy
 * fields) has the club's Super + Sub. A product with no category data at all is
 * treated as a match (the server still enforces the gate on submit). */
export function productMatchesClub(product: any, key: ClubCategoryKey | null): boolean {
  if (!key) return true;
  if (!hasCategoryData(product)) return true;
  const target = `${key.superId}|${key.subId}`;
  const rows =
    Array.isArray(product?.categories) && product.categories.length > 0
      ? product.categories
      : [
          {
            super_category_id: product?.super_category_id,
            sub_category_id: product?.sub_category_id,
          },
        ];
  return rows.some(
    (row: any) =>
      row?.super_category_id &&
      row?.sub_category_id &&
      `${String(row.super_category_id)}|${String(row.sub_category_id)}` === target,
  );
}

/** Filter the product picker options to those matching the selected club. */
export function filterProductsForClub<T>(products: T[], club: any): T[] {
  const key = clubCategoryKey(club);
  if (!key) return products;
  return products.filter((product) => productMatchesClub(product, key));
}
