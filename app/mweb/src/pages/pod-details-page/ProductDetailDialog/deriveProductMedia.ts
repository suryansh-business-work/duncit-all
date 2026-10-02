import { productSpecs, type ProductSpec } from '../product-specs';

/** Resolve the gallery images and spec rows for the active product/variant. */
export function deriveProductMedia(
  product: any,
  selectedVariant: any
): { images: string[]; specs: ProductSpec[] } {
  if (!product) return { images: [], specs: [] };
  const variantImages: string[] = selectedVariant?.images ?? [];
  const base = product.images?.length ? product.images : [product.image_url].filter(Boolean);
  const images = variantImages.length ? variantImages : base;
  const specSource = selectedVariant ? { ...product, ...selectedVariant } : product;
  return { images, specs: productSpecs(specSource) };
}
