import type { BrandWarehouse } from '../warehouse.queries';

/** Form values for one brand warehouse (BrandPickupLocationInput minus the
 * server-forced owner_kind/brand_id). */
export interface WarehouseFormValues {
  nickname: string;
  contact_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

export const emptyWarehouseValues: WarehouseFormValues = {
  nickname: '',
  contact_name: '',
  phone: '',
  email: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  is_default: false,
};

/** Prefill the form from an existing warehouse (or the empty defaults). */
export function warehouseToValues(warehouse?: BrandWarehouse | null): WarehouseFormValues {
  if (!warehouse) return { ...emptyWarehouseValues };
  return {
    nickname: warehouse.nickname ?? '',
    contact_name: warehouse.contact_name ?? '',
    phone: warehouse.phone ?? '',
    email: warehouse.email ?? '',
    address_line1: warehouse.address_line1 ?? '',
    address_line2: warehouse.address_line2 ?? '',
    city: warehouse.city ?? '',
    state: warehouse.state ?? '',
    pincode: warehouse.pincode ?? '',
    country: warehouse.country || 'India',
    is_default: Boolean(warehouse.is_default),
  };
}
