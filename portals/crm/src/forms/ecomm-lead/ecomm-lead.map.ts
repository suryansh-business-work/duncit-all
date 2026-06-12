import type { CrmContact, CrmServiceOffered, EcommLead } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';
import { ecommLeadInitialValues, type EcommLeadFormValues } from './ecomm-lead.types';

const cleanContacts = (contacts: CrmContact[]) =>
  contacts
    .filter((c) => c.name || c.mobile_number || c.email || c.whatsapp_number)
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim(),
      mobile_number: c.mobile_number.trim(),
      whatsapp_number: c.whatsapp_number.trim(),
      email: c.email.trim(),
    }));

const cleanServices = (services: CrmServiceOffered[]) =>
  services
    .filter((s) => s?.service?.trim())
    .map((s) => ({
      service: s.service.trim(),
      custom_name: (s.custom_name ?? '').trim(),
      description: (s.description ?? '').trim(),
    }));

const cleanList = (items: string[]) => (items ?? []).map((t) => t.trim()).filter(Boolean);

/** Form values → GraphQL EcommLeadInput. */
export function toEcommLeadInput(v: EcommLeadFormValues) {
  return {
    super_category_id: v.super_category_id.trim() || null,
    category_ids: v.category_ids,
    sub_category_ids: v.sub_category_ids,
    seller_name: v.seller_name.trim(),
    brand_name: v.brand_name.trim(),
    business_type: v.business_type.trim(),
    city: v.city.trim(),
    area: v.area.trim(),
    contacts: cleanContacts(v.contacts),
    product_categories: cleanList(v.product_categories),
    catalog_size: v.catalog_size.trim(),
    price_range: v.price_range.trim(),
    fulfilment_mode: v.fulfilment_mode.trim(),
    monthly_orders: v.monthly_orders.trim(),
    gst_number: v.gst_number.trim(),
    gst_applicable: v.gst_applicable,
    website: v.website.trim(),
    instagram_link: v.instagram_link.trim(),
    marketplace_links: cleanList(v.marketplace_links),
    services_offered: cleanServices(v.services_offered),
    tags: cleanList(v.tags),
    profile_photo_url: v.profile_photo_url.trim(),
    dynamic_values_json: v.dynamic_values_json || '{}',
    lead_source: v.lead_source,
    assigned_to: v.assigned_to.trim(),
    lead_status: v.lead_status,
    priority: v.priority,
    next_follow_up_date: v.next_follow_up_date ? v.next_follow_up_date.toISOString() : null,
    notes: v.notes.trim(),
  };
}

/** Existing EcommLead → editable form values. */
export function fromEcommLead(lead: EcommLead): EcommLeadFormValues {
  return {
    ...ecommLeadInitialValues,
    super_category_id: lead.super_category_id ?? '',
    category_ids: lead.category_ids ?? [],
    sub_category_ids: lead.sub_category_ids ?? [],
    seller_name: lead.seller_name ?? '',
    brand_name: lead.brand_name ?? '',
    business_type: lead.business_type ?? '',
    city: lead.city ?? '',
    area: lead.area ?? '',
    contacts: lead.contacts?.length ? lead.contacts.map((c) => ({ ...emptyContact, ...c })) : [{ ...emptyContact }],
    product_categories: lead.product_categories ?? [],
    catalog_size: lead.catalog_size ?? '',
    price_range: lead.price_range ?? '',
    fulfilment_mode: lead.fulfilment_mode ?? '',
    monthly_orders: lead.monthly_orders ?? '',
    gst_number: lead.gst_number ?? '',
    gst_applicable: !!lead.gst_applicable,
    website: lead.website ?? '',
    instagram_link: lead.instagram_link ?? '',
    marketplace_links: lead.marketplace_links ?? [],
    services_offered: (lead.services_offered ?? []).map((s) => ({
      service: s.service ?? '',
      custom_name: s.custom_name ?? '',
      description: s.description ?? '',
    })),
    tags: lead.tags ?? [],
    profile_photo_url: lead.profile_photo_url ?? '',
    dynamic_values_json: lead.dynamic_values_json ?? '{}',
    lead_source: lead.lead_source ?? '',
    assigned_to: lead.assigned_to ?? '',
    lead_status: lead.lead_status ?? 'New',
    priority: lead.priority ?? 'Medium',
    next_follow_up_date: lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : null,
    notes: lead.notes ?? '',
  };
}
