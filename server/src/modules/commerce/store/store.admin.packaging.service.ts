import { GraphQLError } from 'graphql';
import { StoreProductModel, type IStoreProduct, type IStoreProductVariant } from './storeProduct.model';
import { packagingMissing, parcelOf, validatePackagingInput } from '@modules/venues/inventory/inventory.packaging';
import { toObjectIds } from './store.shared';

/**
 * Packaging in bulk, from the ecomm portal's Products table (the pet store's
 * own StoreProduct catalogue): set the same
 * values on many products at once, and round-trip them through a CSV.
 *
 * A blank value never overwrites a saved one — a CSV with only the weight
 * column filled changes only the weights. The four dimensions live on the
 * variant when a row names a variant SKU, and on the product otherwise; the
 * package type, HSN code, fragile/liquid flags and shelf life are product-wide.
 */

type Doc = Record<string, any>;

const DIM_FIELDS = ['weight_kg', 'length_cm', 'breadth_cm', 'height_cm'] as const;
const PRODUCT_FIELDS = ['package_type', 'hsn_code', 'is_fragile', 'is_liquid', 'shelf_life_days'] as const;

/** The largest export one request builds — the whole approved catalogue today. */
const EXPORT_LIMIT = 5000;

const filled = (input: Doc, fields: readonly string[]) =>
  Object.fromEntries(fields.filter((f) => input[f] !== undefined && input[f] !== null && input[f] !== '').map((f) => [f, input[f]]));

function exportRow(p: IStoreProduct, variant: IStoreProductVariant | null) {
  const own = variant ?? p;
  const parcel = parcelOf(p, variant);
  return {
    product_id: String(p._id),
    variant_id: variant?._id ? String(variant._id) : '',
    sku: (variant?.sku || p.sku) ?? '',
    product_name: p.product_name,
    variant_label: variant?.option_label ?? '',
    weight_kg: Number(own.weight_kg) || 0,
    length_cm: Number(own.length_cm) || 0,
    breadth_cm: Number(own.breadth_cm) || 0,
    height_cm: Number(own.height_cm) || 0,
    package_type: p.package_type ?? 'BOX',
    hsn_code: p.hsn_code ?? '',
    is_fragile: !!p.is_fragile,
    is_liquid: !!p.is_liquid,
    shelf_life_days: p.shelf_life_days ?? null,
    volumetric_weight_kg: parcel.volumetric_weight_kg,
    chargeable_weight_kg: parcel.chargeable_weight_kg,
    missing: variant ? [] : packagingMissing(p),
  };
}

/** One import row onto its product: dimensions to the named variant (or the product), the rest product-wide. */
function applyRow(doc: IStoreProduct, sku: string, row: Doc) {
  const variant = (doc.variants ?? []).find((v) => v.sku === sku) ?? null;
  Object.assign(variant ?? doc, filled(row, DIM_FIELDS));
  Object.assign(doc, filled(row, PRODUCT_FIELDS));
  if (variant) doc.markModified('variants');
}

export const storeAdminPackagingService = {
  /** Every product not archived, and each of its variants, as CSV rows. */
  async exportRows(productIds?: string[] | null) {
    const filter: Doc = { status: { $ne: 'ARCHIVED' } };
    if (productIds?.length) filter._id = { $in: toObjectIds(productIds) };
    const docs = await StoreProductModel.find(filter).sort({ product_name: 1 }).limit(EXPORT_LIMIT);
    return docs.flatMap((p) => [exportRow(p, null), ...(p.variants ?? []).map((v) => exportRow(p, v))]);
  },

  /** The same packaging on every selected product (product-level values). */
  async bulkSet(productIds: string[], input: Doc) {
    validatePackagingInput(input);
    const values = filled(input, [...DIM_FIELDS, ...PRODUCT_FIELDS]);
    if (Object.keys(values).length === 0) {
      throw new GraphQLError('Fill in at least one packaging value', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const res = await StoreProductModel.updateMany({ _id: { $in: toObjectIds(productIds) } }, { $set: values });
    return res.modifiedCount;
  },

  /** Apply a CSV: rows are matched by product or variant SKU; a bad row is reported, never half-applied. */
  async importRows(rows: Doc[]) {
    const skus = [...new Set(rows.map((r) => String(r.sku ?? '').trim().toUpperCase()).filter(Boolean))];
    const docs = await StoreProductModel.find({ $or: [{ sku: { $in: skus } }, { 'variants.sku': { $in: skus } }] });
    const bySku = new Map<string, IStoreProduct>();
    for (const doc of docs) {
      bySku.set(doc.sku, doc);
      for (const v of doc.variants ?? []) if (v.sku) bySku.set(v.sku, doc);
    }
    const errors: { row: number; sku: string; message: string }[] = [];
    const touched = new Set<IStoreProduct>();
    rows.forEach((row, index) => {
      const sku = String(row.sku ?? '').trim().toUpperCase();
      const line = index + 2; // row 1 is the CSV header
      const doc = bySku.get(sku);
      if (!doc) {
        errors.push({ row: line, sku, message: 'No product or variant has this SKU' });
        return;
      }
      const clean = { ...row, package_type: row.package_type ? String(row.package_type).trim().toUpperCase() : null };
      try {
        validatePackagingInput(clean);
        applyRow(doc, sku, clean);
        touched.add(doc);
      } catch (error) {
        errors.push({ row: line, sku, message: (error as Error).message });
      }
    });
    for (const doc of touched) await doc.save();
    return { updated: rows.length - errors.length, errors };
  },
};
