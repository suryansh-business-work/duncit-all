import { describe, expect, it } from 'vitest';
import { venueLeadSchema } from './venue-lead.schema';
import { venueLeadInitialValues } from './venue-lead.types';
import { toVenueLeadInput } from './venue-lead.map';

const valid = {
  ...venueLeadInitialValues,
  venue_name: 'Sunrise Banquet',
  venue_types: ['Banquet Hall'],
  city: 'Pune',
  full_address: '123 MG Road, Camp',
  contacts: [{ name: 'Asha', role: 'Owner', mobile_number: '9876543210', whatsapp_number: '', email: 'asha@example.com' }],
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
    const error = await venueLeadSchema.validate({ ...valid, capacity_max: 'abc' }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/whole number/i);
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
    const input = toVenueLeadInput({ ...valid, capacity_min: '', contacts: [...valid.contacts, { name: '', role: '', mobile_number: '', whatsapp_number: '', email: '' }] });
    expect(input.capacity_min).toBeNull();
    expect(input.contacts).toHaveLength(1);
  });
});
