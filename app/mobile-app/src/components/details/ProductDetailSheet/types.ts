import type { ResultOf } from '@graphql-typed-document-node/core';

import type { PublicInventoryProductDocument } from '@/graphql/details';

export type Product = NonNullable<
  ResultOf<typeof PublicInventoryProductDocument>['publicInventoryProduct']
>;
export type Variant = Product['variants'][number];

/** The variant the buyer has picked in the sheet, with everything the cart
 * line needs (label/price/image/stock cap). Null for variant-less products.
 * RN twin of mWeb's VariantPick. */
export interface VariantPick {
  id: string;
  label: string;
  unit_cost: number;
  image_url: string;
  max: number;
}

/** A variant's name on its pill: its option label, else colour, else size. */
export const variantLabel = (v: Variant): string =>
  [v.option_label, v.color, v.size_label].find(Boolean) ?? 'Variant';

/** The gallery: the selected variant's images, else the product's image list,
 * falling back to its single cover image. Shared with the pinch-zoom viewer. */
export function productImages(product: Product | null, variant: Variant | null): string[] {
  const variantImages = variant?.images ?? [];
  if (variantImages.length > 0) return variantImages;
  if (!product) return [];
  const gallery = product.images;
  return gallery.length > 0 ? gallery : [product.image_url].filter(Boolean);
}
