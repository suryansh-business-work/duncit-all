import { GraphQLError } from 'graphql';
import { InventoryProductModel, type IInventoryProduct } from './inventory.model';

export const inventoryProductToPub = (product: IInventoryProduct) => {
  const inventory = Number(product.inventory_count) || 0;
  const requested = Number(product.requested_count) || 0;
  return {
    id: String(product._id),
    product_name: product.product_name ?? '',
    sku: product.sku ?? '',
    description: product.description ?? '',
    image_url: product.image_url ?? '',
    unit_cost: product.unit_cost ?? 0,
    inventory_count: inventory,
    requested_count: requested,
    available_count: Math.max(inventory - requested, 0),
    is_active: !!product.is_active,
    created_at: product.created_at?.toISOString?.() ?? '',
    updated_at: product.updated_at?.toISOString?.() ?? '',
  };
};

const cleanSku = (sku: string) => sku.trim().toUpperCase();

function validateInput(input: any) {
  if (input.unit_cost !== undefined && input.unit_cost < 0) {
    throw new GraphQLError('Product cost cannot be negative', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (input.inventory_count !== undefined && input.inventory_count < 0) {
    throw new GraphQLError('Inventory count cannot be negative', { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

export const inventoryService = {
  async list(filter?: { search?: string; activeOnly?: boolean }) {
    const q: any = {};
    if (filter?.activeOnly) q.is_active = true;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ product_name: r }, { sku: r }];
    }
    const docs = await InventoryProductModel.find(q).sort({ product_name: 1 });
    return docs.map(inventoryProductToPub);
  },

  async getById(id: string) {
    const doc = await InventoryProductModel.findById(id);
    return doc ? inventoryProductToPub(doc) : null;
  },

  async create(input: any) {
    validateInput(input);
    const sku = cleanSku(input.sku);
    const existing = await InventoryProductModel.findOne({ sku });
    if (existing) throw new GraphQLError('Product SKU already exists', { extensions: { code: 'CONFLICT' } });
    const doc = await InventoryProductModel.create({
      product_name: input.product_name.trim(),
      sku,
      description: input.description ?? '',
      image_url: input.image_url ?? '',
      unit_cost: Number(input.unit_cost) || 0,
      inventory_count: Number(input.inventory_count) || 0,
      is_active: input.is_active ?? true,
    });
    return inventoryProductToPub(doc);
  },

  async update(id: string, input: any) {
    validateInput(input);
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    if (input.sku !== undefined) {
      const sku = cleanSku(input.sku);
      const existing = await InventoryProductModel.findOne({ sku, _id: { $ne: doc._id } });
      if (existing) throw new GraphQLError('Product SKU already exists', { extensions: { code: 'CONFLICT' } });
      doc.sku = sku;
    }
    for (const field of ['product_name', 'description', 'image_url', 'unit_cost', 'inventory_count', 'is_active']) {
      if (input[field] !== undefined) (doc as any)[field] = input[field];
    }
    await doc.save();
    return inventoryProductToPub(doc);
  },

  async remove(id: string) {
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    doc.is_active = false;
    await doc.save();
    return true;
  },
};