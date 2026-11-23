import { describe, expect, it } from 'vitest';
import { contactsSchema, contactsSchemaFor } from '@/forms/validation/lead-rules';

const contact = (overrides: Partial<Record<'name' | 'role' | 'mobile_number' | 'whatsapp_number' | 'email', string>> = {}) => ({
  name: '',
  role: '',
  mobile_number: '',
  whatsapp_number: '',
  email: '',
  ...overrides,
});

/** Each issue as "path: message", so the tests read which row and field failed. */
const issues = (value: unknown, schema = contactsSchema) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('contactsSchema', () => {
  it('accepts a primary contact with every field blank', () => {
    expect(issues([contact()])).toEqual([]);
  });

  it('accepts a primary contact with only a name, or only a mobile', () => {
    expect(issues([contact({ name: 'Asha' })])).toEqual([]);
    expect(issues([contact({ mobile_number: '9876543210' })])).toEqual([]);
  });

  it('still needs one contact row', () => {
    expect(issues([])).toEqual([': Add at least one contact']);
  });

  it('flags the later row when two contacts share a mobile, however it is written', () => {
    expect(
      issues([
        contact({ name: 'Asha', mobile_number: '9876543210' }),
        contact({ name: 'Ravi', mobile_number: '9123456780' }),
        contact({ name: 'Front desk', mobile_number: '+91 98765-43210' }),
      ])
    ).toEqual(['2.mobile_number: This number is already on another contact of this lead']);
  });

  it('flags a shared email regardless of case and spaces', () => {
    expect(issues([contact({ email: 'asha@cafe.in' }), contact({ email: ' Asha@Cafe.IN' })])).toEqual([
      '1.email: This email is already on another contact of this lead',
    ]);
  });

  it('flags each repeat after the first, not the first row', () => {
    expect(
      issues([contact({ mobile_number: '9876543210' }), contact({ mobile_number: '9876543210' }), contact({ mobile_number: '919876543210' })])
    ).toEqual([
      '1.mobile_number: This number is already on another contact of this lead',
      '2.mobile_number: This number is already on another contact of this lead',
    ]);
  });

  it('ignores blank values and numbers too short to identify anyone', () => {
    expect(issues([contact(), contact(), contact({ mobile_number: '12345' }), contact({ mobile_number: '12345' })])).toEqual([]);
  });

  it('does not compare the WhatsApp number or the name', () => {
    expect(
      issues([
        contact({ name: 'Asha', whatsapp_number: '9876543210' }),
        contact({ name: 'Asha', whatsapp_number: '9876543210' }),
      ])
    ).toEqual([]);
  });

  it('words the message with the translator it is given', () => {
    const echo = ((key: string) => key) as Parameters<typeof contactsSchemaFor>[0];
    const schema = contactsSchemaFor(echo);
    expect(issues([contact({ mobile_number: '9876543210' }), contact({ mobile_number: '9876543210' })], schema)).toEqual([
      '1.mobile_number: crm.duplicates.phoneRepeated',
    ]);
  });
});
