import { describe, expect, it } from 'vitest';
import { makeUserLeadSchema, USER_LEAD_NAME_MAX, userLeadDefaults } from '../src/schemas';

/** A hand-added WhatsApp user lead: the key is echoed, so each assertion names the message shown. */
const schema = makeUserLeadSchema((key) => key);
const messages = (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeUserLeadSchema', () => {
  it('asks for a phone number with digits in it', () => {
    expect(messages(userLeadDefaults)).toEqual(['crm.userLeads.phoneRequired']);
    expect(messages({ phone: '+ -', name: '' })).toEqual(['crm.userLeads.phoneRequired']);
  });

  it('accepts a number with its country code and trims both fields, the name optional', () => {
    expect(schema.parse({ phone: ' +91 98110 00001 ', name: ' Asha ' })).toEqual({ phone: '+91 98110 00001', name: 'Asha' });
    expect(messages({ phone: '919811000001', name: '' })).toEqual([]);
  });

  it('refuses a name longer than the CRM keeps', () => {
    expect(messages({ phone: '919811000001', name: 'x'.repeat(USER_LEAD_NAME_MAX + 1) })).toEqual(['crm.userLeads.nameTooLong']);
  });
});
