import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { StoreCategoryModel, StorePetTypeModel } from '@modules/commerce/store/storeTaxonomy.model';
import type { AnalyticsWindow } from './window';

/**
 * The pet store's orders, read once for a page: the current period and the one
 * before it, with only the fields the numbers need. Revenue is always what the
 * buyer owes — goods + delivery − their share of every discount — and a
 * cancelled order counts as an order but never as revenue.
 */
export interface StoreOrderRow {
  id: string;
  created_at: Date;
  buyer_email: string;
  guest: boolean;
  cancelled: boolean;
  status: string;
  cod: boolean;
  net: number;
  city: string;
  lines: { product_id: string; name: string; qty: number; gross: number }[];
}

export async function loadStoreOrders(window: AnalyticsWindow): Promise<StoreOrderRow[]> {
  const docs = await ProductOrderModel.find({
    channel: 'PET_STORE',
    created_at: { $gte: window.prevFrom, $lt: window.to },
  })
    .select(
      'created_at buyer_email buyer_id cancelled_at fulfilment_status payment_method total discount_total shipping_address.city line_items.product_id line_items.name line_items.qty line_items.gross'
    )
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    created_at: d.created_at,
    buyer_email: String(d.buyer_email ?? '').toLowerCase(),
    guest: !d.buyer_id,
    cancelled: !!d.cancelled_at,
    status: d.fulfilment_status,
    cod: d.payment_method === 'COD',
    net: Math.max(0, (d.total ?? 0) - (d.discount_total ?? 0)),
    city: String(d.shipping_address?.city ?? '').trim(),
    lines: (d.line_items ?? []).map((l) => ({
      product_id: String(l.product_id),
      name: l.name,
      qty: l.qty,
      gross: l.gross,
    })),
  }));
}

/** When each buyer placed their very first store order — "new" vs "returning". */
export async function firstOrderByEmail(): Promise<Map<string, Date>> {
  const rows = await ProductOrderModel.aggregate<{ _id: string; first: Date }>([
    { $match: { channel: 'PET_STORE' } },
    { $group: { _id: { $toLower: '$buyer_email' }, first: { $min: '$created_at' } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.first]));
}

export interface ProductFiling {
  brand: string;
  brandName: string;
  petTypes: string[];
  categories: string[];
}

/** For every product sold: its brand and where it is filed on the store. */
export async function filingOf(productIds: string[]) {
  const products = await InventoryProductModel.find({ _id: { $in: productIds } })
    .select('brand_id brand_name store.pet_type_ids store.category_ids')
    .lean();
  const filing = new Map<string, ProductFiling>(
    products.map((p) => [
      String(p._id),
      {
        brand: p.brand_id ? String(p.brand_id) : 'duncit',
        brandName: p.brand_name || '',
        petTypes: (p.store?.pet_type_ids ?? []).map(String),
        categories: (p.store?.category_ids ?? []).map(String),
      },
    ])
  );
  const [pets, categories] = await Promise.all([
    StorePetTypeModel.find({}).select('name').lean(),
    StoreCategoryModel.find({}).select('name').lean(),
  ]);
  return {
    filing,
    petNames: new Map(pets.map((p) => [String(p._id), p.name])),
    categoryNames: new Map(categories.map((c) => [String(c._id), c.name])),
  };
}
