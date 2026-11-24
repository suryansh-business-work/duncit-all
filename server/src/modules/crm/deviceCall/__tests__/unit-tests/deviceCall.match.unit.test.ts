import {
  contactKeys,
  formatCursor,
  lastActivity,
  parseCursor,
  toDirectoryEntries,
  toPhoneMatch,
  type StoredLeadForPhone,
} from '../../deviceCall.match';

/**
 * The rules behind the Duncit CRM app's caller ID: which lead a ringing number
 * belongs to. A wrong match shows a salesperson the wrong customer's history
 * mid-call; a missed one hides a lead that is calling back.
 */

const lead = (over: Partial<StoredLeadForPhone> = {}): StoredLeadForPhone => ({
  _id: '64b000000000000000000001',
  venue_name: 'Smash Arena',
  city: 'Pune',
  lead_status: 'Contacted',
  priority: 'High',
  assigned_to: 'Asha',
  next_follow_up_date: new Date('2026-12-01T10:00:00.000Z'),
  contacts: [
    { name: 'Rohit', role: 'Owner', mobile_number: '+91 98110 00001', whatsapp_number: '98110 00009' },
    { name: 'Dup', mobile_number: '9811000001' },
  ],
  activity_log: [
    { type: 'CALL', summary: 'Outbound call', created_at: new Date('2026-11-01T09:00:00.000Z') },
    { type: 'NOTE', summary: 'Sent menu', created_at: new Date('2026-11-02T09:00:00.000Z') },
  ],
  ...over,
});

describe('contactKeys', () => {
  it('keys both the mobile and the WhatsApp number of every contact, once each', () => {
    const keys = contactKeys(lead().contacts);
    expect(keys.map((k) => k.key)).toEqual(['9811000001', '9811000009']);
    expect(keys[0]?.contact.name).toBe('Rohit');
  });

  it('skips missing contacts and numbers too short to identify anyone', () => {
    expect(contactKeys([null, { mobile_number: '123' }, { whatsapp_number: '' }])).toEqual([]);
    expect(contactKeys(null)).toEqual([]);
  });
});

describe('lastActivity', () => {
  it('is the newest entry that was not deleted', () => {
    const log = [
      { summary: 'kept', created_at: '2026-11-01T00:00:00.000Z' },
      { summary: 'gone', deleted_at: '2026-11-03T00:00:00.000Z' },
    ];
    expect(lastActivity(log)?.summary).toBe('kept');
  });

  it('is null for an empty or missing timeline', () => {
    expect(lastActivity([])).toBeNull();
    expect(lastActivity(undefined)).toBeNull();
  });
});

describe('toPhoneMatch', () => {
  it('builds the caller ID card from the contact that holds the number', () => {
    expect(toPhoneMatch('VENUE_LEAD', lead(), '9811000009')).toEqual({
      entity_type: 'VENUE_LEAD',
      lead_id: '64b000000000000000000001',
      lead_name: 'Smash Arena',
      contact_name: 'Rohit',
      contact_role: 'Owner',
      city: 'Pune',
      lead_status: 'Contacted',
      priority: 'High',
      assigned_to: 'Asha',
      next_follow_up_date: '2026-12-01T10:00:00.000Z',
      last_activity_summary: 'Sent menu',
      last_activity_at: '2026-11-02T09:00:00.000Z',
    });
  });

  it('is null when the lead the query returned does not actually hold the number', () => {
    expect(toPhoneMatch('VENUE_LEAD', lead(), '9000000000')).toBeNull();
  });

  it('falls back to empty fields, the activity type, and null dates', () => {
    const bare = lead({
      city: null,
      lead_status: undefined,
      priority: null,
      assigned_to: null,
      next_follow_up_date: 'not a date',
      contacts: [{ mobile_number: '9811000001' }],
      activity_log: [{ type: 'EMAIL', created_at: null }],
    });
    const match = toPhoneMatch('VENUE_LEAD', bare, '9811000001');
    expect(match).toMatchObject({
      contact_name: '',
      contact_role: '',
      city: '',
      lead_status: '',
      priority: '',
      assigned_to: '',
      next_follow_up_date: null,
      last_activity_summary: 'EMAIL',
      last_activity_at: null,
    });
  });

  it('reads the name field of the lead kind', () => {
    const host = lead({ venue_name: undefined, host_name: 'Run Club' });
    expect(toPhoneMatch('HOST_LEAD', host, '9811000001')?.lead_name).toBe('Run Club');
    expect(toPhoneMatch('CREATOR_LEAD', host, '9811000001')?.lead_name).toBe('');
  });
});

describe('toDirectoryEntries', () => {
  it('emits one row per distinct number on the lead', () => {
    const rows = toDirectoryEntries('VENUE_LEAD', lead());
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      phone_key: '9811000009',
      entity_type: 'VENUE_LEAD',
      lead_id: '64b000000000000000000001',
      lead_name: 'Smash Arena',
      contact_name: 'Rohit',
      city: 'Pune',
      lead_status: 'Contacted',
      assigned_to: 'Asha',
    });
  });

  it('is empty for a lead with no usable number', () => {
    expect(toDirectoryEntries('VENUE_LEAD', lead({ contacts: [{ name: 'No phone' }], city: null }))).toEqual([]);
  });
});

describe('directory cursor', () => {
  it('round-trips a kind and the last id', () => {
    const cursor = { kind: 2, afterId: '64b000000000000000000001' };
    expect(parseCursor(formatCursor(cursor), 5)).toEqual(cursor);
  });

  it('accepts a kind with no id yet (the start of that kind)', () => {
    expect(parseCursor('3:', 5)).toEqual({ kind: 3, afterId: null });
    expect(formatCursor({ kind: 3, afterId: null })).toBe('3:');
  });

  it.each([null, undefined, '', 'garbage', '1:not-an-id', '9:', '-1:'])('starts over on %p', (raw) => {
    expect(parseCursor(raw, 5)).toEqual({ kind: 0, afterId: null });
  });
});
