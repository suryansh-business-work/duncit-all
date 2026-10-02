/** The variant the buyer has picked in the dialog, with everything the cart
 * line needs (label/price/image/stock cap). Null for variant-less products. */
export interface VariantPick {
  id: string;
  label: string;
  unit_cost: number;
  image_url: string;
  max: number;
}

/** The fields of a product variant the chip row reads. */
export interface ProductVariantOption {
  id: string;
  option_label?: string | null;
  color?: string | null;
  size_label?: string | null;
}
