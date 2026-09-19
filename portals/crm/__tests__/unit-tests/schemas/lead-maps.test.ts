import { describe, expect, it } from 'vitest';
import type { CrmContact, EcommLead, HostLead, VenueLead } from '@/api/crm.types';
import { fromEcommLead, toEcommLeadInput } from '@/forms/ecomm-lead/ecomm-lead.map';
import { ecommLeadInitialValues } from '@/forms/ecomm-lead/ecomm-lead.types';
import { fromHostLead, toHostLeadInput } from '@/forms/host-lead/host-lead.map';
import { hostLeadInitialValues } from '@/forms/host-lead/host-lead.types';
import { fromVenueLead, toVenueLeadInput } from '@/forms/venue-lead/venue-lead.map';
import { venueLeadInitialValues } from '@/forms/venue-lead/venue-lead.types';
import { ecommLead, hostLead, venueLead } from '../fixtures/leads';

const blank: CrmContact = { name: '', role: '', mobile_number: '', whatsapp_number: '', email: '' };

/** One contact per way of being reachable, plus one with nothing on it (dropped). */
const contacts: CrmContact[] = [
  { ...blank, name: ' Meera ', role: ' Owner ' },
  { ...blank, mobile_number: ' 9812345678 ' },
  { ...blank, email: ' events@grandhall.in ' },
  { ...blank, whatsapp_number: ' 9822000000 ' },
  blank,
];

const cleanedContacts = [
  { ...blank, name: 'Meera', role: 'Owner' },
  { ...blank, mobile_number: '9812345678' },
  { ...blank, email: 'events@grandhall.in' },
  { ...blank, whatsapp_number: '9822000000' },
];

const services = [
  { service: ' Catering ', custom_name: null, description: undefined },
  { service: 'Other', custom_name: ' DJ ', description: ' Sound + lights ' },
  { service: '   ', custom_name: 'ignored', description: '' },
];

const cleanedServices = [
  { service: 'Catering', custom_name: '', description: '' },
  { service: 'Other', custom_name: 'DJ', description: 'Sound + lights' },
];

const FOLLOW_UP = new Date('2026-09-25T10:00:00.000Z');

/** A lead as a query that never selected its categories would return it. */
const NO_CATEGORIES = { super_category_id: undefined, category_ids: undefined, sub_category_ids: undefined };

describe('venue lead mapping', () => {
  it('cleans form values into the GraphQL input', () => {
    const input = toVenueLeadInput({
      ...venueLeadInitialValues,
      super_category_id: '  ',
      venue_name: ' Grand Hall ',
      venue_types: ['Banquet', 'Other'],
      venue_type_other: ' Terrace ',
      capacity_min: ' 50 ',
      capacity_max: 'lots',
      contacts,
      photos: 'https://a/1.jpg, https://a/2.jpg\nhttps://a/3.jpg',
      services_offered: services,
      linked_host_ids: ['host-1', ''],
      tags: [' vip ', ' '],
      dynamic_values_json: '',
      next_follow_up_date: FOLLOW_UP,
    });

    expect(input).toMatchObject({
      super_category_id: null,
      venue_name: 'Grand Hall',
      venue_type_other: 'Terrace',
      capacity_min: 50,
      capacity_max: null,
      contacts: cleanedContacts,
      photos: ['https://a/1.jpg', 'https://a/2.jpg', 'https://a/3.jpg'],
      services_offered: cleanedServices,
      linked_host_ids: ['host-1'],
      tags: ['vip'],
      dynamic_values_json: '{}',
      next_follow_up_date: FOLLOW_UP.toISOString(),
    });
  });

  it('drops the "other" venue type text when Other is not picked', () => {
    const input = toVenueLeadInput({ ...venueLeadInitialValues, venue_types: ['Banquet'], venue_type_other: 'Terrace', dynamic_values_json: '{"a":1}' });
    expect(input).toMatchObject({ venue_type_other: '', capacity_min: null, next_follow_up_date: null, dynamic_values_json: '{"a":1}' });
  });

  it('hydrates a fully filled lead', () => {
    const lead = venueLead({ photos: ['https://a/1.jpg', 'https://a/2.jpg'], remarks: 'Call after 6pm', landmark: 'Near metro' });
    const values = fromVenueLead(lead);

    expect(values).toMatchObject({
      super_category_id: 'sc-events',
      category_ids: ['cat-banquet'],
      capacity_min: '50',
      photos: 'https://a/1.jpg\nhttps://a/2.jpg',
      services_offered: [{ service: 'Catering', custom_name: '', description: 'Veg + Jain menus' }],
      remarks: 'Call after 6pm',
      next_follow_up_date: new Date('2026-09-25T00:00:00.000Z'),
    });
    expect(values.contacts[0]).toMatchObject({ name: 'Meera Shah' });
  });

  it('fills in blanks for a lead with only its required fields', () => {
    const sparse = {
      ...venueLead({
        venue_type_other: null,
        venue_description: null,
        capacity_min: null,
        space_type: null,
        area: null,
        landmark: null,
        map_link: null,
        contacts: [],
        available_time_slots: null,
        booking_notice: null,
        expected_charges: null,
        security_deposit: null,
        brochure_url: null,
        website: null,
        services_offered: [{ service: 'Decor', custom_name: null, description: null }],
        logo_url: null,
        lead_source: null,
        assigned_to: null,
        next_follow_up_date: null,
        remarks: null,
      }),
      ...NO_CATEGORIES,
    };

    const values = fromVenueLead(sparse);

    expect(values).toMatchObject({
      super_category_id: '',
      category_ids: [],
      sub_category_ids: [],
      venue_type_other: '',
      capacity_min: '',
      contacts: [{ ...blank }],
      services_offered: [{ service: 'Decor', custom_name: '', description: '' }],
      website: '',
      next_follow_up_date: null,
      remarks: '',
    });
  });
});

describe('host lead mapping', () => {
  it('cleans form values into the GraphQL input', () => {
    const input = toHostLeadInput({
      ...hostLeadInitialValues,
      super_category_id: 'sc-events',
      host_name: ' Pune Runners ',
      contacts,
      services_offered: services,
      community_size: ' 400 ',
      past_attendees: '',
      preferred_event_date: FOLLOW_UP,
      next_follow_up_date: FOLLOW_UP,
      tags: [' weekend ', ''],
      dynamic_values_json: '',
    });

    expect(input).toMatchObject({
      super_category_id: 'sc-events',
      host_name: 'Pune Runners',
      contacts: cleanedContacts,
      services_offered: cleanedServices,
      community_size: 400,
      past_attendees: null,
      preferred_event_date: FOLLOW_UP.toISOString(),
      next_follow_up_date: FOLLOW_UP.toISOString(),
      tags: ['weekend'],
      dynamic_values_json: '{}',
    });
  });

  it('leaves unset dates and ids empty', () => {
    const input = toHostLeadInput({ ...hostLeadInitialValues, community_size: 'many', dynamic_values_json: '{}' });
    expect(input).toMatchObject({ super_category_id: null, preferred_event_date: null, next_follow_up_date: null, community_size: null });
  });

  it('hydrates a fully filled lead', () => {
    const values = fromHostLead(hostLead({ preferred_event_date: '2026-10-04T00:00:00.000Z', notes: 'Prefers Sundays' }));

    expect(values).toMatchObject({
      super_category_id: 'sc-events',
      host_type: 'Community',
      community_size: '400',
      past_attendees: '120',
      preferred_event_date: new Date('2026-10-04T00:00:00.000Z'),
      notes: 'Prefers Sundays',
      next_follow_up_date: new Date('2026-09-25T00:00:00.000Z'),
    });
  });

  it('fills in blanks for a lead with only its required fields', () => {
    const sparse = {
      ...hostLead({
        host_type: null,
        organization_name: null,
        city: null,
        area: null,
        contacts: [],
        expected_audience_size: null,
        frequency: null,
        budget_range: null,
        preferred_event_date: null,
        preferred_day: null,
        preferred_time_slot: null,
        website: null,
        services_offered: [{ service: 'Venue', custom_name: null, description: null }],
        instagram_link: null,
        community_link: null,
        community_size: null,
        past_attendees: null,
        profile_photo_url: null,
        lead_source: null,
        assigned_to: null,
        next_follow_up_date: null,
        notes: null,
      }),
      ...NO_CATEGORIES,
    };

    const values = fromHostLead(sparse);

    expect(values).toMatchObject({
      super_category_id: '',
      category_ids: [],
      sub_category_ids: [],
      host_type: '',
      organization_name: '',
      city: '',
      contacts: [{ ...blank }],
      community_size: '',
      preferred_event_date: null,
      services_offered: [{ service: 'Venue', custom_name: '', description: '' }],
      next_follow_up_date: null,
      notes: '',
    });
  });
});

describe('ecomm lead mapping', () => {
  it('cleans form values into the GraphQL input', () => {
    const input = toEcommLeadInput({
      ...ecommLeadInitialValues,
      super_category_id: ' sc-retail ',
      seller_name: ' Kavya Iyer ',
      contacts,
      product_categories: [' Sarees ', ''],
      marketplace_links: [' https://amazon.in/kavya '],
      services_offered: services,
      tags: ['', ' handloom '],
      dynamic_values_json: '',
      next_follow_up_date: FOLLOW_UP,
    });

    expect(input).toMatchObject({
      super_category_id: 'sc-retail',
      seller_name: 'Kavya Iyer',
      contacts: cleanedContacts,
      product_categories: ['Sarees'],
      marketplace_links: ['https://amazon.in/kavya'],
      services_offered: cleanedServices,
      tags: ['handloom'],
      dynamic_values_json: '{}',
      next_follow_up_date: FOLLOW_UP.toISOString(),
    });
  });

  it('leaves unset ids and dates empty', () => {
    const input = toEcommLeadInput({ ...ecommLeadInitialValues, dynamic_values_json: '{}' });
    expect(input).toMatchObject({ super_category_id: null, next_follow_up_date: null, dynamic_values_json: '{}' });
  });

  it('hydrates a fully filled lead', () => {
    const values = fromEcommLead(ecommLead({ notes: 'Ships pan-India' }));

    expect(values).toMatchObject({
      super_category_id: 'sc-events',
      brand_name: 'Kavya Handlooms',
      gst_number: '33ABCDE1234F1Z5',
      gst_applicable: true,
      notes: 'Ships pan-India',
      next_follow_up_date: new Date('2026-09-25T00:00:00.000Z'),
    });
    expect(values.contacts[0]).toMatchObject({ name: 'Kavya Iyer' });
  });

  it('fills in blanks for a lead with only its required fields', () => {
    const sparse = {
      ...ecommLead({
        brand_name: null,
        business_type: null,
        city: null,
        area: null,
        contacts: [],
        catalog_size: null,
        price_range: null,
        fulfilment_mode: null,
        monthly_orders: null,
        gst_number: null,
        gst_applicable: false,
        website: null,
        instagram_link: null,
        services_offered: [{ service: 'Photoshoot', custom_name: null, description: null }],
        profile_photo_url: null,
        lead_source: null,
        assigned_to: null,
        next_follow_up_date: null,
        notes: null,
      }),
      ...NO_CATEGORIES,
    };

    const values = fromEcommLead(sparse);

    expect(values).toMatchObject({
      super_category_id: '',
      category_ids: [],
      sub_category_ids: [],
      brand_name: '',
      gst_number: '',
      gst_applicable: false,
      contacts: [{ ...blank }],
      services_offered: [{ service: 'Photoshoot', custom_name: '', description: '' }],
      next_follow_up_date: null,
      notes: '',
    });
  });
});

describe('the fixtures stay honest', () => {
  it('build leads of each kind', () => {
    const leads: Array<VenueLead | HostLead | EcommLead> = [venueLead(), hostLead(), ecommLead()];
    expect(leads.map((l) => l.id)).toEqual(['venue-1', 'host-1', 'ecomm-1']);
  });
});
