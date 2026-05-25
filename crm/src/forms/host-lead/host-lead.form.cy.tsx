import { describe, expect, it } from 'vitest';
import { hostLeadSchema } from './host-lead.schema';
import { hostLeadInitialValues } from './host-lead.types';
import { toHostLeadInput } from './host-lead.map';

const valid = {
  ...hostLeadInitialValues,
  host_name: 'Ravi Sharma',
  host_type: 'Event Organizer',
  contacts: [{ name: 'Ravi', role: 'Organizer', mobile_number: '9811122233', whatsapp_number: '', email: 'ravi@example.com' }],
};

describe('hostLeadSchema', () => {
  it('accepts a valid host lead', async () => {
    await expect(hostLeadSchema.validate(valid)).resolves.toBeTruthy();
  });

  it('requires host name', async () => {
    const error = await hostLeadSchema.validate({ ...valid, host_name: '' }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/host name/i);
  });

  it('requires the primary contact mobile number', async () => {
    const error = await hostLeadSchema
      .validate({ ...valid, contacts: [{ ...valid.contacts[0], mobile_number: '' }] })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/primary contact mobile/i);
  });

  it('rejects non-numeric community size', async () => {
    const error = await hostLeadSchema.validate({ ...valid, community_size: 'big' }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/whole number/i);
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
});
