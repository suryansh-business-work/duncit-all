import { describe, expect, it } from 'vitest';
import { venueLeadSchema } from '@/forms/venue-lead/venue-lead.schema';
import { venueLeadInitialValues } from '@/forms/venue-lead/venue-lead.types';
import { fromVenueLead, toVenueLeadInput } from '@/forms/venue-lead/venue-lead.map';
import type { VenueLead } from '@/api/crm.types';

const valid = {
  ...venueLeadInitialValues,
  super_category_id: '64a000000000000000000001',
  venue_name: 'Sunrise Banquet',
  venue_types: ['Banquet Hall'],
  city: 'Pune',
  full_address: '123 MG Road, Camp',
  contacts: [
    { name: 'Asha', role: 'Owner', mobile_number: '9876543210', whatsapp_number: '', email: 'asha@example.com' },
  ],
};

describe('venueLeadSchema', () => {
  it('accepts a valid venue lead', async () => {
    await expect(venueLeadSchema.validate(valid)).resolves.toBeTruthy();
  });

  it('requires venue name, city and full address', async () => {
    const error = await venueLeadSchema
      .validate({ ...valid, venue_name: '', city: '', full_address: '' }, { abortEarly: false })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/venue name/i);
    expect(error.errors.join(' ')).toMatch(/city/i);
    expect(error.errors.join(' ')).toMatch(/address/i);
  });

  it('requires at least one venue type', async () => {
    const error = await venueLeadSchema.validate({ ...valid, venue_types: [] }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/venue type/i);
  });

  it('requires the primary contact mobile number', async () => {
    const error = await venueLeadSchema
      .validate({ ...valid, contacts: [{ ...valid.contacts[0], mobile_number: '' }] })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/primary contact mobile/i);
  });

  it('rejects non-numeric capacity', async () => {
    const error = await venueLeadSchema
      .validate({ ...valid, capacity_max: 'abc' })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/whole number/i);
  });

  it('requires super category', async () => {
    const error = await venueLeadSchema
      .validate({ ...valid, super_category_id: '' })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/super category is required/i);
  });

  it('accepts a website url', async () => {
    await expect(
      venueLeadSchema.validate({ ...valid, website: 'https://example.com' })
    ).resolves.toBeTruthy();
  });

  it('rejects a malformed website', async () => {
    const error = await venueLeadSchema
      .validate({ ...valid, website: 'not-a-url' })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/valid website/i);
  });

  it('accepts a valid services_offered list', async () => {
    await expect(
      venueLeadSchema.validate({
        ...valid,
        services_offered: [
          { service: 'Catering', custom_name: '', description: 'Veg + non-veg' },
        ],
      })
    ).resolves.toBeTruthy();
  });

  it('requires custom_name when service is "Other"', async () => {
    const error = await venueLeadSchema
      .validate({
        ...valid,
        services_offered: [{ service: 'Other', custom_name: '', description: '' }],
      })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/custom service name/i);
  });

  it('rejects empty service row', async () => {
    const error = await venueLeadSchema
      .validate({
        ...valid,
        services_offered: [{ service: '', custom_name: '', description: '' }],
      })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/pick a service/i);
  });
});

describe('toVenueLeadInput', () => {
  it('converts numbers, media lines and dates', () => {
    const input = toVenueLeadInput({
      ...valid,
      capacity_min: '10',
      capacity_max: '200',
      photos: 'https://a.com/1.jpg\nhttps://a.com/2.jpg',
      next_follow_up_date: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(input.capacity_min).toBe(10);
    expect(input.capacity_max).toBe(200);
    expect(input.photos).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
    expect(input.next_follow_up_date).toBe('2026-06-01T00:00:00.000Z');
    expect(input.contacts).toHaveLength(1);
  });

  it('drops empty contacts and empty numbers', () => {
    const input = toVenueLeadInput({
      ...valid,
      capacity_min: '',
      contacts: [
        ...valid.contacts,
        { name: '', role: '', mobile_number: '', whatsapp_number: '', email: '' },
      ],
    });
    expect(input.capacity_min).toBeNull();
    expect(input.contacts).toHaveLength(1);
  });

  it('passes super_category_id, website and cleaned services', () => {
    const input = toVenueLeadInput({
      ...valid,
      website: '  https://duncit.com  ',
      services_offered: [
        { service: 'Catering', custom_name: '', description: 'Veg + non-veg' },
        { service: 'Other', custom_name: 'Live Streaming Pro', description: '' },
        { service: '', custom_name: '', description: 'orphan row' },
      ],
    });
    expect(input.super_category_id).toBe('64a000000000000000000001');
    expect(input.website).toBe('https://duncit.com');
    expect(input.services_offered).toHaveLength(2);
    expect(input.services_offered[0]).toMatchObject({ service: 'Catering' });
    expect(input.services_offered[1]).toMatchObject({ service: 'Other', custom_name: 'Live Streaming Pro' });
  });

  it('nulls super_category_id when blank', () => {
    const input = toVenueLeadInput({ ...valid, super_category_id: '' });
    expect(input.super_category_id).toBeNull();
  });
});

describe('fromVenueLead', () => {
  it('hydrates form values from a server-shaped lead', () => {
    const lead: VenueLead = {
      id: 'v1',
      super_category_id: 'cat-1',
      super_category: { id: 'cat-1', name: 'Sports', slug: 'sports' },
      venue_name: 'Arena',
      venue_types: ['Cricket Ground'],
      city: 'Bengaluru',
      area: 'Indiranagar',
      full_address: '12 MG Rd',
      contacts: [
        { name: 'Asha', role: 'Owner', mobile_number: '9876543210', whatsapp_number: '', email: 'asha@x.com' },
      ],
      event_suitability: [],
      available_days: [],
      pricing_models: [],
      gst_applicable: true,
      invoice_available: false,
      amenities: [],
      photos: ['https://a.com/1.jpg'],
      videos: [],
      website: 'https://arena.test',
      services_offered: [{ service: 'Catering', custom_name: '', description: '' }],
      linked_host_ids: [],
      linked_hosts: [],
      lead_status: 'New',
      priority: 'High',
      next_follow_up_date: '2026-06-01T00:00:00.000Z',
      activity_log: [],
    };
    const v = fromVenueLead(lead);
    expect(v.super_category_id).toBe('cat-1');
    expect(v.venue_name).toBe('Arena');
    expect(v.website).toBe('https://arena.test');
    expect(v.services_offered).toEqual([
      { service: 'Catering', custom_name: '', description: '' },
    ]);
    expect(v.next_follow_up_date).toEqual(new Date('2026-06-01T00:00:00.000Z'));
    expect(v.photos).toBe('https://a.com/1.jpg');
    expect(v.gst_applicable).toBe(true);
  });

  it('defaults missing optional fields safely', () => {
    const v = fromVenueLead({
      id: 'v2',
      venue_name: 'Bare',
      venue_types: [],
      city: 'Pune',
      full_address: '1 Park Lane',
      contacts: [],
      event_suitability: [],
      available_days: [],
      pricing_models: [],
      gst_applicable: false,
      invoice_available: false,
      amenities: [],
      photos: [],
      videos: [],
      services_offered: [],
      linked_host_ids: [],
      linked_hosts: [],
      lead_status: 'New',
      priority: 'Medium',
      activity_log: [],
    });
    expect(v.super_category_id).toBe('');
    expect(v.website).toBe('');
    expect(v.services_offered).toEqual([]);
    expect(v.contacts).toHaveLength(1);
  });
});
