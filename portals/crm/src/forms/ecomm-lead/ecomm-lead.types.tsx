import type { CrmContact, CrmServiceOffered } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';

export interface EcommLeadFormValues {
  super_category_id: string;
  category_ids: string[];
  sub_category_ids: string[];
  seller_name: string;
  brand_name: string;
  business_type: string;
  city: string;
  area: string;
  contacts: CrmContact[];
  product_categories: string[];
  catalog_size: string;
  price_range: string;
  fulfilment_mode: string;
  monthly_orders: string;
  gst_number: string;
  gst_applicable: boolean;
  website: string;
  instagram_link: string;
  marketplace_links: string[];
  services_offered: CrmServiceOffered[];
  tags: string[];
  profile_photo_url: string;
  dynamic_values_json: string;
  lead_source: string;
  assigned_to: string;
  lead_status: string;
  priority: string;
  next_follow_up_date: Date | null;
  notes: string;
}

export const ecommLeadInitialValues: EcommLeadFormValues = {
  super_category_id: '',
  category_ids: [],
  sub_category_ids: [],
  seller_name: '',
  brand_name: '',
  business_type: '',
  city: '',
  area: '',
  contacts: [{ ...emptyContact }],
  product_categories: [],
  catalog_size: '',
  price_range: '',
  fulfilment_mode: '',
  monthly_orders: '',
  gst_number: '',
  gst_applicable: false,
  website: '',
  instagram_link: '',
  marketplace_links: [],
  services_offered: [],
  tags: [],
  profile_photo_url: '',
  dynamic_values_json: '{}',
  lead_source: '',
  assigned_to: '',
  lead_status: 'New',
  priority: 'Medium',
  next_follow_up_date: null,
  notes: '',
};
