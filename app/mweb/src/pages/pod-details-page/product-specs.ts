/** A product's physical spec fields as fetched from the Product portal. */
export interface ProductLike {
  size_label?: string | null;
  color?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  length_cm?: number | null;
  breadth_cm?: number | null;
}

export interface ProductSpec {
  label: string;
  value: string;
}

/** Build the label/value spec rows for the product-detail dialog, skipping any
 * empty field so the dialog never shows blank rows. Mirrors the mobile util 1:1. */
export function productSpecs(product: ProductLike): ProductSpec[] {
  const specs: ProductSpec[] = [];
  if (product.size_label?.trim()) specs.push({ label: 'Size', value: product.size_label.trim() });
  if (product.color?.trim()) specs.push({ label: 'Color', value: product.color.trim() });
  if (product.weight_kg && product.weight_kg > 0) {
    specs.push({ label: 'Weight', value: `${product.weight_kg} kg` });
  }
  const length = Number(product.length_cm) || 0;
  const breadth = Number(product.breadth_cm) || 0;
  const height = Number(product.height_cm) || 0;
  if (length + breadth + height > 0) {
    specs.push({ label: 'Dimensions', value: `${length} × ${breadth} × ${height} cm` });
  }
  return specs;
}

/** Rupee-format a number (whole rupees), e.g. 1499 → "₹1,499". */
export function formatRupees(amount?: number | null): string {
  return `₹${Math.round(amount ?? 0).toLocaleString('en-IN')}`;
}
