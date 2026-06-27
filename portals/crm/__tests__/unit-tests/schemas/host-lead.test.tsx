import { describe, expect, it } from 'vitest';
import { hostLeadSchema } from '@/forms/host-lead/host-lead.schema';
import { hostLeadInitialValues } from '@/forms/host-lead/host-lead.types';
import { fromHostLead, toHostLeadInput } from '@/forms/host-lead/host-lead.map';
import type { HostLead } from '@/api/crm.types';

const valid = {
  ...hostLeadInitialValues,
  super_category_id: '64a000000000000000000001',
  host_name: 'Ravi Sharma',
  host_type: 'Event Organizer',
  contacts: [
    { name: 'Ravi', role: 'Organizer', mobile_number: '9811122233', whatsapp_number: '', email: 'ravi@example.com' },
  ],
};

/** Collect every zod issue message for a value into one searchable string. */
const messages = (value: unknown): string => {
  const result = hostLeadSchema.safeParse(value);
  return result.success ? '' : result.error.issues.map((i) => i.message).join(' ');
};

describe('hostLeadSchema', () => {
  it('accepts a valid host lead', () => {
    expect(hostLeadSchema.safeParse(valid).success).toBe(true);
  });

  it('requires host name', () => {
    expect(messages({ ...valid, host_name: '' })).toMatch(/host name/i);
  });

  it('requires the primary contact mobile number', () => {
    expect(messages({ ...valid, contacts: [{ ...valid.contacts[0], mobile_number: '' }] })).toMatch(
      /primary contact mobile/i
    );
  });

  it('rejects non-numeric community size', () => {
    expect(messages({ ...valid, community_size: 'big' })).toMatch(/whole number/i);
  });

  it('requires super category', () => {
    expect(messages({ ...valid, super_category_id: '' })).toMatch(/super category is required/i);
  });

  it('rejects malformed website', () => {
    expect(messages({ ...valid, website: 'foo' })).toMatch(/valid website/i);
  });

  it('requires custom_name when service is "Other"', () => {
    expect(messages({ ...valid, services_offered: [{ service: 'Other', custom_name: '', description: '' }] })).toMatch(
      /custom service name/i
    );
  });
});

describe('toHostLeadInput', () => {
  it('converts numbers and dates', () => {
    const input = toHostLeadInput({
      ...valid,
      community_size: '500',
      past_attendees: '120',
      preferred_event_date: new Date('2026-07-10T00:00:00.000Z'),
      need_venue: true,
    });
    expect(input.community_size).toBe(500);
    expect(input.past_attendees).toBe(120);
    expect(input.need_venue).toBe(true);
    expect(input.preferred_event_date).toBe('2026-07-10T00:00:00.000Z');
  });

  it('passes super_category_id, website and services', () => {
    const input = toHostLeadInput({
      ...valid,
      website: 'https://hosts.test',
      services_offered: [
        { service: 'DJ / Music', custom_name: '', description: '' },
        { service: 'Other', custom_name: 'Comedy Open Mic', description: '' },
      ],
    });
    expect(input.super_category_id).toBe('64a000000000000000000001');
    expect(input.website).toBe('https://hosts.test');
    expect(input.services_offered).toHaveLength(2);
    expect(input.services_offered[1]).toMatchObject({ service: 'Other', custom_name: 'Comedy Open Mic' });
  });
});

describe('fromHostLead', () => {
  it('hydrates form values from a server-shaped host lead', () => {
    const lead: HostLead = {
      id: 'h1',
      super_category_id: 'cat-1',
      super_category: { id: 'cat-1', name: 'Sports', slug: 'sports' },
      host_name: 'Pod Host',
      host_type: 'Community Admin',
      organization_name: 'Pune Cricket',
      contacts: [
        { name: 'Ravi', role: 'Lead', mobile_number: '9811122233', whatsapp_number: '', email: 'ravi@x.com' },
      ],
      interests: ['Cricket / Sports'],
      revenue_models: [],
      need_venue: true,
      need_vendor: false,
      previous_events_hosted: true,
      past_attendees: 80,
      host_intent_scores: [],
      website: 'https://host.test',
      services_offered: [
        { service: 'Other', custom_name: 'Photographer', description: '' },
      ],
      tags: [],
      dynamic_values_json: '{}',
      lead_status: 'Contacted',
      priority: 'High',
      activity_log: [],
    };
    const v = fromHostLead(lead);
    expect(v.super_category_id).toBe('cat-1');
    expect(v.website).toBe('https://host.test');
    expect(v.services_offered).toEqual([
      { service: 'Other', custom_name: 'Photographer', description: '' },
    ]);
    expect(v.past_attendees).toBe('80');
    expect(v.need_venue).toBe(true);
  });
});
