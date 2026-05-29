import type {
  InventoryStatus,
  InventoryVisibility,
  ProductType,
  StockMovementType,
  UnitType,
} from './types';

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'MERCHANDISE', label: 'Merchandise' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];

export const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'PIECE', label: 'Piece' },
  { value: 'BOTTLE', label: 'Bottle' },
  { value: 'PACKET', label: 'Packet' },
  { value: 'BOX', label: 'Box' },
  { value: 'KG', label: 'Kilogram' },
  { value: 'LITRE', label: 'Litre' },
  { value: 'METER', label: 'Meter' },
  { value: 'OTHER', label: 'Other' },
];

export const STATUS_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const VISIBILITY_OPTIONS: { value: InventoryVisibility; label: string }[] = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'INTERNAL', label: 'Internal' },
];

export const MOVEMENT_TYPE_OPTIONS: { value: StockMovementType; label: string }[] = [
  { value: 'IN', label: 'Stock in' },
  { value: 'OUT', label: 'Stock out' },
  { value: 'RESERVE', label: 'Reserve' },
  { value: 'RELEASE', label: 'Release reserve' },
  { value: 'DAMAGE', label: 'Mark damaged' },
  { value: 'ADJUST', label: 'Adjust to value' },
];

export const STATUS_CHIP_COLOR: Record<InventoryStatus, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  DRAFT: 'warning',
  OUT_OF_STOCK: 'error',
  ARCHIVED: 'default',
};
