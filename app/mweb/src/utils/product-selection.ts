/** Composite key for a product selection line — a product bought as a specific
 * variant is a distinct line from its base (primary-variant) form.
 * Mirrored in the mobile app (src/utils/product-selection.ts). */
export const selectionKey = (productId: string, variantId?: string | null): string =>
  variantId ? `${productId}::${variantId}` : productId;

export interface ParsedSelectionKey {
  product_id: string;
  variant_id: string;
}

export const parseSelectionKey = (key: string): ParsedSelectionKey => {
  const [product_id, variant_id = ''] = key.split('::');
  return { product_id, variant_id };
};
