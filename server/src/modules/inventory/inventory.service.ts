import { GraphQLError } from 'graphql';
import type { AuthUser } from '../../context';
import { PodModel } from '../pod/pod.model';
import { InventoryProductModel, type IInventoryProduct } from './inventory.model';
import { InventoryActivityLogModel } from './inventoryActivityLog.model';
import { InventoryStockMovementModel } from './inventoryStockMovement.model';

const SKU_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomSku = () => {
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += SKU_ALPHABET[Math.floor(Math.random() * SKU_ALPHABET.length)];
  }
  return s;
};

const TRACKED_FIELDS = [
  'product_name',
  'sku',
  'short_description',
  'description',
  'category_id',
  'brand_name',
  'product_type',
  'unit_type',
  'image_url',
  'images',
  'min_order_qty',
  'max_order_qty',
  'low_stock_alert',
  'inventory_count',
  'reserved_count',
  'damaged_count',
  'vendor_name',
  'supplier_contact',
  'unit_cost',
  'purchase_price',
  'selling_price',
  'tax_percent',
  'discount_percent',
  'weight_volume',
  'expiry_date',
  'manufacturing_date',
  'batch_number',
  'storage_instructions',
  'status',
  'visibility',
  'tags',
  'pod_available',
  'host_request_allowed',
  'delivery_available',
  'delivery_charge',
  'listing_review_status',
  'listing_review_notes',
  'listing_submitted_by_id',
  'listing_submitted_by_name',
  'listing_reviewed_by_id',
  'listing_reviewed_by_name',
  'is_duncit_delivery_partner',
  'size_label',
  'height_cm',
  'weight_kg',
  'color',
  'commission_pct',
  'delivery_target',
  'barcode',
  'is_active',
] as const;

const STOCK_FIELDS = new Set([
  'inventory_count',
  'reserved_count',
  'damaged_count',
]);

const dateToIso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export const inventoryProductToPub = (product: IInventoryProduct) => {
  const inventory = Number(product.inventory_count) || 0;
  const requested = Number(product.requested_count) || 0;
  const reserved = Number(product.reserved_count) || 0;
  return {
    id: String(product._id),
    product_name: product.product_name ?? '',
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    short_description: product.short_description ?? '',
    description: product.description ?? '',
    category_id: product.category_id ? String(product.category_id) : null,
    brand_name: product.brand_name ?? '',
    product_type: product.product_type ?? 'CONSUMABLE',
    unit_type: product.unit_type ?? 'PIECE',
    image_url: product.image_url ?? '',
    images: Array.isArray(product.images) ? product.images : [],
    min_order_qty: product.min_order_qty ?? 1,
    max_order_qty: product.max_order_qty ?? 100,
    low_stock_alert: product.low_stock_alert ?? 5,
    inventory_count: inventory,
    reserved_count: reserved,
    damaged_count: product.damaged_count ?? 0,
    requested_count: requested,
    available_count: Math.max(inventory - requested - reserved, 0),
    vendor_name: product.vendor_name ?? '',
    supplier_contact: product.supplier_contact ?? '',
    unit_cost: product.unit_cost ?? 0,
    purchase_price: product.purchase_price ?? 0,
    selling_price: product.selling_price ?? 0,
    tax_percent: product.tax_percent ?? 0,
    discount_percent: product.discount_percent ?? 0,
    weight_volume: product.weight_volume ?? '',
    expiry_date: dateToIso(product.expiry_date),
    manufacturing_date: dateToIso(product.manufacturing_date),
    batch_number: product.batch_number ?? '',
    storage_instructions: product.storage_instructions ?? '',
    status: product.status ?? 'ACTIVE',
    visibility: product.visibility ?? 'PUBLIC',
    tags: Array.isArray(product.tags) ? product.tags : [],
    pod_available: !!product.pod_available,
    host_request_allowed: !!product.host_request_allowed,
    delivery_available: !!product.delivery_available,
    delivery_charge: product.delivery_charge ?? 0,
    listing_review_status: product.listing_review_status ?? 'APPROVED',
    listing_review_notes: product.listing_review_notes ?? '',
    listing_submitted_by_id: product.listing_submitted_by_id ?? null,
    listing_submitted_by_name: product.listing_submitted_by_name ?? '',
    listing_reviewed_by_id: product.listing_reviewed_by_id ?? null,
    listing_reviewed_by_name: product.listing_reviewed_by_name ?? '',
    is_duncit_delivery_partner: !!product.is_duncit_delivery_partner,
    size_label: product.size_label ?? '',
    height_cm: product.height_cm ?? 0,
    weight_kg: product.weight_kg ?? 0,
    color: product.color ?? '',
    commission_pct: product.commission_pct ?? 5,
    delivery_target: product.delivery_target ?? 'HOST',
    is_active: !!product.is_active,
    last_updated_by_id: product.last_updated_by_id ?? null,
    last_updated_by_name: product.last_updated_by_name ?? '',
    created_at: product.created_at?.toISOString?.() ?? '',
    updated_at: product.updated_at?.toISOString?.() ?? '',
  };
};

async function generateUniqueSku(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = randomSku();
    const exists = await InventoryProductModel.exists({ sku: candidate });
    if (!exists) return candidate;
  }
  throw new GraphQLError('Could not generate a unique SKU, please retry', {
    extensions: { code: 'SKU_GEN_FAILED' },
  });
}

function changedFields(before: any, after: any): string[] {
  const changes: string[] = [];
  for (const field of TRACKED_FIELDS) {
    const a = JSON.stringify(before?.[field] ?? null);
    const b = JSON.stringify(after?.[field] ?? null);
    if (a !== b) changes.push(field);
  }
  return changes;
}

const userInfo = (user: AuthUser | null) => ({
  id: user?.id ?? null,
  name: user?.email || user?.id || 'system',
});

async function logActivity(
  productId: any,
  user: AuthUser | null,
  action: 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'RESTORE' | 'DUPLICATE' | 'DELETE',
  changed_fields: string[],
  notes = ''
) {
  const info = userInfo(user);
  await InventoryActivityLogModel.create({
    product_id: productId,
    user_id: info.id,
    user_name: info.name,
    action,
    changed_fields,
    notes,
  });
}

async function recordStockChanges(
  product: IInventoryProduct,
  beforeStock: { inventory_count: number; reserved_count: number; damaged_count: number },
  user: AuthUser | null
) {
  const info = userInfo(user);
  const map: Array<[
    'inventory_count' | 'reserved_count' | 'damaged_count',
    'ADJUST' | 'RESERVE' | 'DAMAGE',
  ]> = [
    ['inventory_count', 'ADJUST'],
    ['reserved_count', 'RESERVE'],
    ['damaged_count', 'DAMAGE'],
  ];
  for (const [field, type] of map) {
    const before = beforeStock[field] ?? 0;
    const after = (product as any)[field] ?? 0;
    if (before === after) continue;
    await InventoryStockMovementModel.create({
      product_id: product._id,
      user_id: info.id,
      user_name: info.name,
      type,
      quantity: after - before,
      reason: 'Direct edit',
      balance_after: product.inventory_count,
    });
  }
}

function validateInput(input: any) {
  if (input.unit_cost !== undefined && input.unit_cost < 0) {
    throw new GraphQLError('Product cost cannot be negative', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (input.inventory_count !== undefined && input.inventory_count < 0) {
    throw new GraphQLError('Inventory count cannot be negative', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (input.min_order_qty !== undefined && input.max_order_qty !== undefined &&
      input.min_order_qty > input.max_order_qty) {
    throw new GraphQLError('Min order qty cannot exceed max order qty', { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

function cleanText(value: unknown, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function listingImages(input: any) {
  const rawImages = Array.isArray(input.images) ? input.images : [];
  return Array.from(new Set([input.image_url, ...rawImages]
    .map((value) => cleanText(value))
    .filter((value) => /^https?:\/\//i.test(value))));
}

function validateProductListingInput(input: any) {
  if (!cleanText(input.product_name, 200)) {
    throw new GraphQLError('Product title is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (listingImages(input).length === 0) {
    throw new GraphQLError('Upload at least one product image before submitting', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (cleanText(input.description).length < 20) {
    throw new GraphQLError('Product description must be at least 20 characters', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (Number(input.inventory_count) < 1) {
    throw new GraphQLError('Inventory availability must be at least 1', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (Number(input.unit_cost) <= 0) {
    throw new GraphQLError('Product price must be greater than 0', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const commission = Number(input.commission_pct);
  if (commission < 5 || commission > 50) {
    throw new GraphQLError('Commission must be between 5% and 50%', { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

async function ownedListing(id: string, user: AuthUser | null) {
  if (!user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
  const doc = await InventoryProductModel.findOne({ _id: id, listing_submitted_by_id: user.id });
  if (!doc) throw new GraphQLError('Product listing not found', { extensions: { code: 'NOT_FOUND' } });
  return doc;
}

function applyListingFields(doc: IInventoryProduct, input: any, user: AuthUser | null) {
  const images = listingImages(input);
  doc.product_name = cleanText(input.product_name, 200);
  doc.short_description = cleanText(input.description, 220);
  doc.description = cleanText(input.description);
  doc.image_url = images[0] ?? '';
  doc.images = images;
  doc.inventory_count = Number(input.inventory_count) || 0;
  doc.unit_cost = Number(input.unit_cost) || 0;
  doc.purchase_price = Number(input.unit_cost) || 0;
  doc.selling_price = Number(input.unit_cost) || 0;
  doc.is_duncit_delivery_partner = !!input.is_duncit_delivery_partner;
  doc.size_label = cleanText(input.size_label, 120);
  doc.height_cm = Number(input.height_cm) || 0;
  doc.weight_kg = Number(input.weight_kg) || 0;
  doc.color = cleanText(input.color, 80);
  doc.commission_pct = Number(input.commission_pct) || 5;
  doc.delivery_target = input.delivery_target === 'VENUE' ? 'VENUE' : 'HOST';
  const info = userInfo(user);
  doc.last_updated_by_id = info.id;
  doc.last_updated_by_name = info.name;
}

function applyInput(target: any, input: any) {
  for (const field of TRACKED_FIELDS) {
    if (input[field] === undefined) continue;
    if (field === 'expiry_date' || field === 'manufacturing_date') {
      target[field] = input[field] ? new Date(input[field]) : null;
    } else if (field === 'sku') {
      target.sku = String(input.sku).trim().toUpperCase();
    } else {
      target[field] = input[field];
    }
  }
}

export const inventoryService = {
  async generateSku() {
    return generateUniqueSku();
  },

  async list(filter?: { search?: string; activeOnly?: boolean; status?: string }) {
    const q: any = {};
    if (filter?.activeOnly) q.is_active = true;
    if (filter?.status) q.status = filter.status;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ product_name: r }, { sku: r }, { tags: r }, { brand_name: r }];
    }
    const docs = await InventoryProductModel.find(q).sort({ product_name: 1 });
    return docs.map(inventoryProductToPub);
  },

  async listProductRequests(status?: string | null) {
    const q: any = { listing_submitted_by_id: { $exists: true, $nin: [null, ''] } };
    if (status) q.listing_review_status = status;
    const docs = await InventoryProductModel.find(q).sort({ created_at: -1 }).limit(300);
    return docs.map(inventoryProductToPub);
  },

  async listMyProductListings(user: AuthUser | null) {
    if (!user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    const docs = await InventoryProductModel.find({ listing_submitted_by_id: user.id }).sort({ updated_at: -1 }).limit(200);
    return docs.map(inventoryProductToPub);
  },

  async getById(id: string) {
    const doc = await InventoryProductModel.findById(id);
    return doc ? inventoryProductToPub(doc) : null;
  },

  async submitProductListing(input: any, user: AuthUser | null) {
    if (!user) throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    validateProductListingInput(input);
    const info = userInfo(user);
    const sku = await generateUniqueSku();
    const images = listingImages(input);
    const doc = await InventoryProductModel.create({
      product_name: cleanText(input.product_name, 200),
      sku,
      short_description: cleanText(input.description, 220),
      description: cleanText(input.description),
      image_url: images[0] ?? '',
      images,
      inventory_count: Number(input.inventory_count) || 0,
      unit_cost: Number(input.unit_cost) || 0,
      purchase_price: Number(input.unit_cost) || 0,
      selling_price: Number(input.unit_cost) || 0,
      vendor_name: info.name,
      supplier_contact: user.email ?? '',
      status: 'DRAFT',
      visibility: 'INTERNAL',
      is_active: false,
      pod_available: false,
      host_request_allowed: false,
      delivery_available: true,
      listing_review_status: 'PENDING',
      listing_submitted_by_id: info.id,
      listing_submitted_by_name: info.name,
      is_duncit_delivery_partner: !!input.is_duncit_delivery_partner,
      size_label: cleanText(input.size_label, 120),
      height_cm: Number(input.height_cm) || 0,
      weight_kg: Number(input.weight_kg) || 0,
      color: cleanText(input.color, 80),
      commission_pct: Number(input.commission_pct) || 5,
      delivery_target: input.delivery_target === 'VENUE' ? 'VENUE' : 'HOST',
      last_updated_by_id: info.id,
      last_updated_by_name: info.name,
    });
    await logActivity(doc._id, user, 'CREATE', ['partner_listing'], 'Partner product listing submitted');
    return inventoryProductToPub(doc);
  },

  async updateMyProductListing(id: string, input: any, user: AuthUser | null) {
    validateProductListingInput(input);
    const doc = await ownedListing(id, user);
    const before = doc.toObject();
    const beforeStock = {
      inventory_count: doc.inventory_count,
      reserved_count: doc.reserved_count,
      damaged_count: doc.damaged_count,
    };
    applyListingFields(doc, input, user);
    doc.listing_review_status = 'PENDING';
    doc.listing_review_notes = '';
    doc.status = 'DRAFT';
    doc.visibility = 'INTERNAL';
    doc.is_active = false;
    doc.pod_available = false;
    doc.host_request_allowed = false;
    await doc.save();
    await logActivity(doc._id, user, 'UPDATE', changedFields(before, doc.toObject()), 'Partner listing updated for review');
    await recordStockChanges(doc, beforeStock, user);
    return inventoryProductToPub(doc);
  },

  async updateMyProductListingQuantity(id: string, inventoryCount: number, user: AuthUser | null) {
    if (!Number.isInteger(inventoryCount) || inventoryCount < 0) {
      throw new GraphQLError('Quantity must be a whole number', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await ownedListing(id, user);
    const beforeStock = {
      inventory_count: doc.inventory_count,
      reserved_count: doc.reserved_count,
      damaged_count: doc.damaged_count,
    };
    const info = userInfo(user);
    const committedCount = Number(doc.requested_count || 0) + Number(doc.reserved_count || 0);
    if (inventoryCount < committedCount) {
      throw new GraphQLError(`Quantity cannot be less than ${committedCount} committed units`, { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.inventory_count = inventoryCount;
    doc.last_updated_by_id = info.id;
    doc.last_updated_by_name = info.name;
    await doc.save();
    await logActivity(doc._id, user, 'UPDATE', ['inventory_count'], 'Partner quantity updated');
    await recordStockChanges(doc, beforeStock, user);
    return inventoryProductToPub(doc);
  },

  async deleteMyProductListing(id: string, user: AuthUser | null) {
    const doc = await ownedListing(id, user);
    doc.is_active = false;
    doc.status = 'ARCHIVED';
    doc.pod_available = false;
    doc.host_request_allowed = false;
    await doc.save();
    await logActivity(doc._id, user, 'DELETE', ['status', 'is_active'], 'Partner listing deleted');
    return true;
  },

  async reviewProductListing(id: string, status: string, notes: string | null | undefined, user: AuthUser | null) {
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product listing request not found', { extensions: { code: 'NOT_FOUND' } });
    const info = userInfo(user);
    doc.listing_review_status = status === 'APPROVED' ? 'APPROVED' : 'DENIED';
    doc.listing_review_notes = cleanText(notes, 1000);
    doc.listing_reviewed_by_id = info.id;
    doc.listing_reviewed_by_name = info.name;
    doc.status = status === 'APPROVED' ? 'ACTIVE' : 'ARCHIVED';
    doc.visibility = status === 'APPROVED' ? 'PUBLIC' : 'INTERNAL';
    doc.is_active = status === 'APPROVED';
    doc.pod_available = status === 'APPROVED';
    doc.host_request_allowed = status === 'APPROVED';
    doc.last_updated_by_id = info.id;
    doc.last_updated_by_name = info.name;
    await doc.save();
    await logActivity(doc._id, user, status === 'APPROVED' ? 'RESTORE' : 'ARCHIVE', ['listing_review_status'], doc.listing_review_notes);
    return inventoryProductToPub(doc);
  },

  async create(input: any, user: AuthUser | null) {
    validateInput(input);
    const sku = input.sku?.trim() ? String(input.sku).trim().toUpperCase() : await generateUniqueSku();
    const existing = await InventoryProductModel.findOne({ sku });
    if (existing) throw new GraphQLError('Product SKU already exists', { extensions: { code: 'CONFLICT' } });

    const info = userInfo(user);
    const doc = await InventoryProductModel.create({
      product_name: String(input.product_name).trim(),
      sku,
      unit_cost: Number(input.unit_cost) || 0,
      last_updated_by_id: info.id,
      last_updated_by_name: info.name,
    });
    applyInput(doc, { ...input, sku });
    await doc.save();
    await logActivity(doc._id, user, 'CREATE', ['*']);
    if (doc.inventory_count > 0) {
      await InventoryStockMovementModel.create({
        product_id: doc._id,
        user_id: info.id,
        user_name: info.name,
        type: 'IN',
        quantity: doc.inventory_count,
        reason: 'Initial stock',
        balance_after: doc.inventory_count,
      });
    }
    return inventoryProductToPub(doc);
  },

  async update(id: string, input: any, user: AuthUser | null) {
    validateInput(input);
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });

    if (input.sku !== undefined && input.sku !== null) {
      const sku = String(input.sku).trim().toUpperCase();
      if (sku && sku !== doc.sku) {
        const conflict = await InventoryProductModel.findOne({ sku, _id: { $ne: doc._id } });
        if (conflict) throw new GraphQLError('Product SKU already exists', { extensions: { code: 'CONFLICT' } });
      }
    }

    const before = doc.toObject();
    const beforeStock = {
      inventory_count: doc.inventory_count,
      reserved_count: doc.reserved_count,
      damaged_count: doc.damaged_count,
    };
    applyInput(doc, input);
    const info = userInfo(user);
    doc.last_updated_by_id = info.id;
    doc.last_updated_by_name = info.name;
    await doc.save();

    const changes = changedFields(before, doc.toObject()).filter((f) => !STOCK_FIELDS.has(f));
    if (changes.length > 0) await logActivity(doc._id, user, 'UPDATE', changes);
    await recordStockChanges(doc, beforeStock, user);

    return inventoryProductToPub(doc);
  },

  async remove(id: string, user: AuthUser | null) {
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    doc.is_active = false;
    doc.status = 'ARCHIVED';
    await doc.save();
    await logActivity(doc._id, user, 'DELETE', ['status', 'is_active']);
    return true;
  },

  async listLinkedPods(productId: string) {
    const pods = await PodModel.find(
      { 'product_requests.product_id': productId },
      { _id: 1, pod_id: 1, pod_title: 1, club_id: 1, is_active: 1 }
    )
      .sort({ updated_at: -1 })
      .limit(200);
    return pods.map((p: any) => ({
      id: String(p._id),
      pod_id: p.pod_id ?? '',
      pod_title: p.pod_title ?? '',
      club_id: p.club_id ? String(p.club_id) : '',
      is_active: !!p.is_active,
    }));
  },

  async permanentlyDelete(id: string, user: AuthUser | null) {
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    await logActivity(doc._id, user, 'DELETE', ['*'], `Hard-deleted ${doc.sku}`);
    await InventoryProductModel.deleteOne({ _id: doc._id });
    return true;
  },

  async archive(id: string, user: AuthUser | null) {
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    doc.status = 'ARCHIVED';
    doc.is_active = false;
    await doc.save();
    await logActivity(doc._id, user, 'ARCHIVE', ['status', 'is_active']);
    return inventoryProductToPub(doc);
  },

  async restore(id: string, user: AuthUser | null) {
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    doc.status = 'ACTIVE';
    doc.is_active = true;
    await doc.save();
    await logActivity(doc._id, user, 'RESTORE', ['status', 'is_active']);
    return inventoryProductToPub(doc);
  },

  async duplicate(id: string, user: AuthUser | null) {
    const src = await InventoryProductModel.findById(id);
    if (!src) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    const newSku = await generateUniqueSku();
    const info = userInfo(user);
    const obj = src.toObject() as any;
    delete obj._id;
    delete obj.id;
    delete obj.created_at;
    delete obj.updated_at;
    obj.product_name = `${src.product_name} (copy)`;
    obj.sku = newSku;
    obj.status = 'DRAFT';
    obj.inventory_count = 0;
    obj.reserved_count = 0;
    obj.damaged_count = 0;
    obj.requested_count = 0;
    obj.last_updated_by_id = info.id;
    obj.last_updated_by_name = info.name;
    const copy = await InventoryProductModel.create(obj);
    await logActivity(copy._id, user, 'DUPLICATE', ['*'], `Duplicated from ${src.sku}`);
    return inventoryProductToPub(copy);
  },

  async recordStockMovement(
    id: string,
    input: { type: string; quantity: number; reason?: string },
    user: AuthUser | null
  ) {
    const doc = await InventoryProductModel.findById(id);
    if (!doc) throw new GraphQLError('Product not found', { extensions: { code: 'NOT_FOUND' } });
    const qty = Math.abs(Number(input.quantity) || 0);
    if (qty === 0) throw new GraphQLError('Quantity is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const info = userInfo(user);

    switch (input.type) {
      case 'IN':
        doc.inventory_count += qty;
        break;
      case 'OUT':
        if (doc.inventory_count < qty)
          throw new GraphQLError('Insufficient stock', { extensions: { code: 'BAD_USER_INPUT' } });
        doc.inventory_count -= qty;
        break;
      case 'RESERVE':
        doc.reserved_count += qty;
        break;
      case 'RELEASE':
        doc.reserved_count = Math.max(0, doc.reserved_count - qty);
        break;
      case 'DAMAGE':
        doc.damaged_count += qty;
        doc.inventory_count = Math.max(0, doc.inventory_count - qty);
        break;
      case 'ADJUST':
        doc.inventory_count = qty;
        break;
      default:
        throw new GraphQLError('Unknown movement type', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    doc.last_updated_by_id = info.id;
    doc.last_updated_by_name = info.name;
    await doc.save();
    await InventoryStockMovementModel.create({
      product_id: doc._id,
      user_id: info.id,
      user_name: info.name,
      type: input.type,
      quantity: input.type === 'OUT' || input.type === 'RELEASE' ? -qty : qty,
      reason: input.reason ?? '',
      balance_after: doc.inventory_count,
    });
    return inventoryProductToPub(doc);
  },

  async listActivityLogs(productId: string, limit = 100) {
    const docs = await InventoryActivityLogModel.find({ product_id: productId })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit, 1), 500));
    return docs.map((d) => ({
      id: String(d._id),
      product_id: String(d.product_id),
      user_id: d.user_id ?? null,
      user_name: d.user_name ?? '',
      action: d.action,
      changed_fields: d.changed_fields ?? [],
      notes: d.notes ?? '',
      created_at: d.created_at?.toISOString?.() ?? '',
    }));
  },

  async listStockMovements(productId: string, limit = 100) {
    const docs = await InventoryStockMovementModel.find({ product_id: productId })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit, 1), 500));
    return docs.map((d) => ({
      id: String(d._id),
      product_id: String(d.product_id),
      user_id: d.user_id ?? null,
      user_name: d.user_name ?? '',
      type: d.type,
      quantity: d.quantity,
      reason: d.reason ?? '',
      balance_after: d.balance_after ?? 0,
      created_at: d.created_at?.toISOString?.() ?? '',
    }));
  },

  async analytics(productId: string, days = 30) {
    const window = Math.min(Math.max(days, 1), 180);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (window - 1));

    const movements = await InventoryStockMovementModel.find({
      product_id: productId,
      created_at: { $gte: since },
    }).sort({ created_at: 1 });

    const buckets = new Map<string, { in_qty: number; out_qty: number }>();
    for (let i = 0; i < window; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), { in_qty: 0, out_qty: 0 });
    }
    for (const m of movements) {
      const key = m.created_at.toISOString().slice(0, 10);
      const slot = buckets.get(key);
      if (!slot) continue;
      if (m.quantity >= 0) slot.in_qty += m.quantity;
      else slot.out_qty += Math.abs(m.quantity);
    }
    return Array.from(buckets.entries()).map(([date, v]) => ({
      date,
      in_qty: v.in_qty,
      out_qty: v.out_qty,
      net_qty: v.in_qty - v.out_qty,
    }));
  },
};
