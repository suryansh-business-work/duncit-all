import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import type {
  ProductListingValues,
  ProductOptionValues,
  ProductVariantValues,
  VariantOptionValue,
} from './list-products.types';

export const emptyVariant: ProductVariantValues = {
  option_label: '',
  option_values: [],
  color: '#000000',
  size_label: '',
  description: '',
  image_urls: [],
  height_cm: '',
  weight_kg: '',
  length_cm: '',
  breadth_cm: '',
  unit_cost: '',
  inventory_count: '',
};

export const emptyValues: ProductListingValues = {
  categories: [{ ...EMPTY_CATEGORY }],
  product_name: '',
  options: [],
  variants: [{ ...emptyVariant }],
  commission_pct: 15,
  delivery_target: 'SHIPROCKET',
  pickup_location_id: '',
  free_delivery_above: '',
};

const comboKey = (values: VariantOptionValue[]) =>
  values.map((value) => `${value.name}=${value.value}`).join('|');

const sizeFromValues = (values: VariantOptionValue[]) =>
  values.find((value) => value.name.trim().toLowerCase() === 'size')?.value ?? '';

/** Regenerate the variant list as the cartesian product of the product options,
 * preserving any already-entered detail for combinations that still exist. When
 * there are no options, keep the current variants (or one default). */
export function generateVariants(
  options: ProductOptionValues[],
  existing: ProductVariantValues[],
): ProductVariantValues[] {
  const active = options.filter((option) => option.name.trim() && option.values.length > 0);
  if (active.length === 0) {
    return existing.length > 0 ? existing : [{ ...emptyVariant }];
  }
  let combos: VariantOptionValue[][] = [[]];
  for (const option of active) {
    combos = combos.flatMap((combo) =>
      option.values.map((value) => [...combo, { name: option.name.trim(), value }]),
    );
  }
  const byKey = new Map(existing.map((variant) => [comboKey(variant.option_values ?? []), variant]));
  return combos.map((option_values) => {
    const label = option_values.map((value) => value.value).join(' / ');
    const previous = byKey.get(comboKey(option_values));
    if (previous) return { ...previous, option_values, option_label: label };
    return { ...emptyVariant, option_values, option_label: label, size_label: sizeFromValues(option_values) };
  });
}

const toNumberOrEmpty = (value: unknown): number | string =>
  value === null || value === undefined || value === '' ? '' : Number(value);

const mapServerVariant = (variant: any): ProductVariantValues => ({
  option_label: variant.option_label ?? '',
  option_values: Array.isArray(variant.option_values)
    ? variant.option_values.map((o: any) => ({ name: o.name ?? '', value: o.value ?? '' }))
    : [],
  color: variant.color || '#000000',
  size_label: variant.size_label ?? '',
  description: variant.description ?? '',
  image_urls: Array.isArray(variant.images) ? variant.images : [],
  height_cm: toNumberOrEmpty(variant.height_cm),
  weight_kg: toNumberOrEmpty(variant.weight_kg),
  length_cm: toNumberOrEmpty(variant.length_cm),
  breadth_cm: toNumberOrEmpty(variant.breadth_cm),
  unit_cost: toNumberOrEmpty(variant.unit_cost),
  inventory_count: toNumberOrEmpty(variant.inventory_count),
});

/** Legacy products stored their single variant in the flat product fields. */
const variantFromFlat = (product: any): ProductVariantValues => {
  const images = Array.from(new Set([product.image_url, ...(product.images ?? [])].filter(Boolean)));
  return {
    option_label: product.size_label || product.color || 'Default',
    option_values: [],
    color: product.color || '#000000',
    size_label: product.size_label ?? '',
    description: product.description ?? '',
    image_urls: images as string[],
    height_cm: toNumberOrEmpty(product.height_cm),
    weight_kg: toNumberOrEmpty(product.weight_kg),
    length_cm: toNumberOrEmpty(product.length_cm),
    breadth_cm: toNumberOrEmpty(product.breadth_cm),
    unit_cost: toNumberOrEmpty(product.unit_cost),
    inventory_count: toNumberOrEmpty(product.inventory_count),
  };
};

const mapServerCategory = (category: any): AdminCategoryValue => ({
  super_id: category.super_category_id ? String(category.super_category_id) : '',
  super_name: category.super_category_name ?? '',
  category_id: category.category_id ? String(category.category_id) : '',
  category_name: category.category_name ?? '',
  sub_id: category.sub_category_id ? String(category.sub_category_id) : '',
  sub_name: category.sub_category_name ?? '',
});

const categoriesFromProduct = (product: any): AdminCategoryValue[] => {
  if (Array.isArray(product.categories) && product.categories.length > 0) {
    return product.categories.map(mapServerCategory);
  }
  if (product.super_category_id && product.category_id && product.sub_category_id) {
    return [
      {
        super_id: String(product.super_category_id),
        super_name: '',
        category_id: String(product.category_id),
        category_name: '',
        sub_id: String(product.sub_category_id),
        sub_name: '',
      },
    ];
  }
  return [{ ...EMPTY_CATEGORY }];
};

export function productToValues(product?: any): ProductListingValues {
  if (!product) {
    return { ...emptyValues, categories: [{ ...EMPTY_CATEGORY }], variants: [{ ...emptyVariant }] };
  }
  const variants =
    Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants.map(mapServerVariant)
      : [variantFromFlat(product)];
  return {
    categories: categoriesFromProduct(product),
    product_name: product.product_name ?? '',
    options: Array.isArray(product.options)
      ? product.options.map((option: any) => ({
          name: option.name ?? '',
          values: Array.isArray(option.values) ? option.values : [],
        }))
      : [],
    variants,
    commission_pct: product.commission_pct ?? 15,
    // Keep the product's own delivery target on edit — resetting it silently
    // converted PICKUP-style listings into ShipRocket ones.
    delivery_target: product.delivery_target ?? 'SHIPROCKET',
    pickup_location_id: product.pickup_location_id ?? '',
    free_delivery_above: toNumberOrEmpty(product.free_delivery_above),
  };
}

const toVariantInput = (variant: ProductVariantValues) => ({
  option_label: variant.option_label,
  option_values: variant.option_values.map((value) => ({ name: value.name, value: value.value })),
  color: variant.color,
  size_label: variant.size_label,
  description: variant.description,
  images: variant.image_urls,
  height_cm: Number(variant.height_cm) || 0,
  weight_kg: Number(variant.weight_kg) || 0,
  length_cm: Number(variant.length_cm) || 0,
  breadth_cm: Number(variant.breadth_cm) || 0,
  unit_cost: Number(variant.unit_cost) || 0,
  inventory_count: Number(variant.inventory_count) || 0,
});

/** Build the moderateProductContent input from the form values — product name +
 * every variant's labels/description + the union of all variant images. */
export function buildProductModerationInput(values: ProductListingValues) {
  const image_urls = Array.from(new Set(values.variants.flatMap((variant) => variant.image_urls)));
  return {
    product_name: values.product_name,
    variants: values.variants.map((variant) => ({
      option_label: variant.option_label,
      size_label: variant.size_label,
      description: variant.description,
    })),
    image_urls,
  };
}

/** Resolve a moderation violation's field to the wizard step (Product=1,
 * Variants=2) and, when it maps to a concrete RHF field, its form path. */
export function productViolationTarget(field: string): { stepIndex: number; path: string | null } {
  if (field === 'product_name') return { stepIndex: 1, path: 'product_name' };
  if (field.startsWith('variants.')) return { stepIndex: 2, path: field };
  if (field === 'description' || field === 'image') return { stepIndex: 2, path: null };
  return { stepIndex: 1, path: null };
}

/** Build the ProductListingInput. The first variant backfills the flat product
 * fields (the server also mirrors them) and the single category triple. */
export function toSubmitInput(values: ProductListingValues, brandId: string) {
  const primary = values.variants[0];
  const totalStock = values.variants.reduce((sum, variant) => sum + (Number(variant.inventory_count) || 0), 0);
  const categories = values.categories.map((category) => ({
    super_category_id: category.super_id,
    category_id: category.category_id,
    sub_category_id: category.sub_id,
    super_category_name: category.super_name,
    category_name: category.category_name,
    sub_category_name: category.sub_name,
  }));
  return {
    brand_id: brandId,
    categories,
    super_category_id: categories[0]?.super_category_id ?? '',
    category_id: categories[0]?.category_id ?? '',
    sub_category_id: categories[0]?.sub_category_id ?? '',
    product_name: values.product_name,
    options: values.options
      .filter((option) => option.name.trim() && option.values.length > 0)
      .map((option) => ({ name: option.name.trim(), values: option.values })),
    image_url: primary.image_urls[0] ?? '',
    images: primary.image_urls,
    description: primary.description,
    size_label: primary.size_label,
    height_cm: Number(primary.height_cm) || 0,
    weight_kg: Number(primary.weight_kg) || 0,
    length_cm: Number(primary.length_cm) || 0,
    breadth_cm: Number(primary.breadth_cm) || 0,
    color: primary.color,
    inventory_count: totalStock,
    unit_cost: Number(primary.unit_cost) || 0,
    variants: values.variants.map(toVariantInput),
    commission_pct: values.commission_pct,
    delivery_target: values.delivery_target,
    pickup_location_id: values.pickup_location_id,
    free_delivery_above: values.free_delivery_above === '' ? null : Number(values.free_delivery_above),
  };
}
