import { makeEcommLeadSchema } from '@duncit/forms/schemas';

import { fallbackT } from '@/i18n/fallback';
import { LEAD_KINDS } from '@/features/leads/leadKinds';
import { KIND_EDITORS } from '../kinds';
import { cleanContacts, formToInput, leadDefaults, leadToForm } from '../values';

/**
 * Form values ⇄ API. A mistake here blanks portal-managed fields on a phone
 * save, or sends text where the API wants a number — so every rule is pinned.
 */

const contact = (over: Partial<Record<string, string>> = {}) => ({
  name: '',
  role: '',
  mobile_number: '',
  whatsapp_number: '',
  email: '',
  ...over,
});

describe('leadDefaults', () => {
  it('starts every kind as the portal does: New, Medium, one blank contact, no follow-up', () => {
    for (const kind of LEAD_KINDS) {
      const values = leadDefaults(kind);
      expect(values).toMatchObject({
        lead_status: 'New',
        priority: 'Medium',
        next_follow_up_date: null,
        assigned_user_id: '',
      });
      expect(values.contacts).toEqual([contact()]);
      expect(values[KIND_EDITORS[kind].nameField]).toBe('');
      for (const field of KIND_EDITORS[kind].fields) expect(values[field.name]).toBe('');
    }
  });

  it('gives venues their venue types and prospects their social links', () => {
    expect(leadDefaults('VENUE_LEAD')).toMatchObject({
      venue_types: [],
      venue_type_other: '',
      remarks: '',
    });
    expect(leadDefaults('CREATOR_LEAD')).toMatchObject({ social_links: [], notes: '' });
    expect(leadDefaults('COMMUNITY_LEAD')).toHaveProperty('social_links', []);
    expect(leadDefaults('HOST_LEAD')).toMatchObject({ preferred_event_date: null });
    expect(leadDefaults('ECOMM_LEAD')).not.toHaveProperty('social_links');
  });

  it('passes the portal schema for its kind once the name, category and a contact are filled', () => {
    const values = {
      ...leadDefaults('ECOMM_LEAD'),
      super_category_id: 'c1',
      seller_name: 'Paws Co',
      contacts: [contact({ name: 'Mira', mobile_number: '9811000001' })],
    };
    expect(makeEcommLeadSchema(fallbackT).safeParse(values).success).toBe(true);
    expect(makeEcommLeadSchema(fallbackT).safeParse(leadDefaults('ECOMM_LEAD')).success).toBe(
      false,
    );
  });
});

describe('leadToForm', () => {
  it('turns numbers and nulls into text, keeps lists and dates, and maps every contact', () => {
    const values = leadToForm('VENUE_LEAD', {
      venue_name: 'Smash Arena',
      capacity_min: 20,
      capacity_max: null,
      venue_types: ['Cafe', 'Other'],
      next_follow_up_date: '2026-12-01T00:00:00.000Z',
      contacts: [
        {
          name: 'Rohit',
          role: null,
          mobile_number: '9811000001',
          whatsapp_number: undefined,
          email: 'r@x.in',
        },
      ],
      services_offered: [{ service: 'DJ', custom_name: null, description: 'Weekends' }],
      unknown_field: 'ignored',
    });
    expect(values).toMatchObject({
      venue_name: 'Smash Arena',
      capacity_min: '20',
      capacity_max: '',
      venue_types: ['Cafe', 'Other'],
    });
    expect(values.next_follow_up_date).toBe('2026-12-01T00:00:00.000Z');
    expect(values.contacts).toEqual([
      contact({ name: 'Rohit', mobile_number: '9811000001', email: 'r@x.in' }),
    ]);
    expect(values.services_offered).toEqual([
      { service: 'DJ', custom_name: '', description: 'Weekends' },
    ]);
    expect(values).not.toHaveProperty('unknown_field');
  });

  it('keeps one blank contact for a lead without any, and reads social links for prospects', () => {
    const values = leadToForm('CREATOR_LEAD', {
      creator_name: 'Ana',
      contacts: [],
      social_links: [{ name: 'YouTube', url: null }],
    });
    expect(values.contacts).toEqual([contact()]);
    expect(values.social_links).toEqual([{ name: 'YouTube', url: '' }]);
    expect(
      leadToForm('HOST_LEAD', { host_name: 'Run Club', next_follow_up_date: null })
        .next_follow_up_date,
    ).toBeNull();
  });
});

describe('cleanContacts', () => {
  it('drops empty rows and trims the rest', () => {
    expect(
      cleanContacts([
        contact(),
        contact({ name: ' Mira ', email: ' m@x.in ' }),
        contact({ whatsapp_number: '98110 00001' }),
      ]),
    ).toEqual([
      contact({ name: 'Mira', email: 'm@x.in' }),
      contact({ whatsapp_number: '98110 00001' }),
    ]);
  });
});

describe('formToInput', () => {
  it('sends only the fields the phone shows, numbers as numbers, blanks as null', () => {
    const values = {
      ...leadDefaults('VENUE_LEAD'),
      venue_name: '  Smash Arena ',
      capacity_min: '20.7',
      capacity_max: '',
      expected_charges: '1500',
      security_deposit: 'abc',
      super_category_id: '',
      remarks: ' Good turf ',
      amenities: ['Parking'],
    };
    const input = formToInput('VENUE_LEAD', values);
    expect(input).toMatchObject({
      venue_name: 'Smash Arena',
      capacity_min: 20,
      capacity_max: null,
      expected_charges: 1500,
      security_deposit: null,
      super_category_id: null,
      assigned_user_id: null,
      remarks: 'Good turf',
      next_follow_up_date: null,
    });
    // Portal-managed fields are never sent, so a phone save cannot blank them.
    expect(input).not.toHaveProperty('amenities');
    expect(input).not.toHaveProperty('services_offered');
  });

  it('sends the other venue type only when Other is picked', () => {
    const withOther = formToInput('VENUE_LEAD', {
      ...leadDefaults('VENUE_LEAD'),
      venue_types: ['Other'],
      venue_type_other: ' Rooftop ',
    });
    expect(withOther).toMatchObject({ venue_types: ['Other'], venue_type_other: 'Rooftop' });
    const without = formToInput('VENUE_LEAD', {
      ...leadDefaults('VENUE_LEAD'),
      venue_types: ['Cafe'],
      venue_type_other: 'Rooftop',
    });
    expect(without).toMatchObject({ venue_types: ['Cafe'], venue_type_other: '' });
  });

  it('sends back the dates the server rewrites on every save, as loaded', () => {
    const values = {
      ...leadDefaults('HOST_LEAD'),
      host_name: 'Run Club',
      preferred_event_date: '2026-12-24T00:00:00.000Z',
      next_follow_up_date: '2026-12-01T00:00:00.000Z',
    };
    expect(formToInput('HOST_LEAD', values)).toMatchObject({
      preferred_event_date: '2026-12-24T00:00:00.000Z',
      next_follow_up_date: '2026-12-01T00:00:00.000Z',
    });
  });

  it('keeps the assignee id and name together, and drops empty contacts', () => {
    const values = {
      ...leadDefaults('ECOMM_LEAD'),
      assigned_user_id: 'u1',
      assigned_to: ' Asha ',
      contacts: [contact(), contact({ name: 'Mira' })],
    };
    const input = formToInput('ECOMM_LEAD', values);
    expect(input).toMatchObject({
      assigned_user_id: 'u1',
      assigned_to: 'Asha',
      contacts: [contact({ name: 'Mira' })],
    });
    expect(input).not.toHaveProperty('venue_types');
  });
});
