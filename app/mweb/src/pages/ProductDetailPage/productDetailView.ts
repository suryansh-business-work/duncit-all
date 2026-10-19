interface ImageSource {
  images?: string[] | null;
  image_url?: string | null;
}

/** The images the product page shows: the picked variant's own, else the product's (or its single cover). */
export function shownImages(product: ImageSource | null | undefined, variant: ImageSource | null | undefined): string[] {
  const variantImages = variant?.images ?? [];
  if (variantImages.length) return variantImages;
  if (product?.images?.length) return product.images;
  return product?.image_url ? [product.image_url] : [];
}
