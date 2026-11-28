/**
 * An employee's contact details — one contract for the HR console's personal
 * form and the Employee console's own contact form, matching the server.
 */
import { describe, expect, it } from 'vitest';

import { hrContactDefaults, hrContactValuesFrom, makeHrContactSchema, type HrContactValues } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key;
const schema = makeHrContactSchema(t);

const values = (over: Partial<HrContactValues> = {}): HrContactValues => ({ ...hrContactDefaults, ...over });
const issues = (v: HrContactValues) => {
  const result = schema.safeParse(v);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('makeHrContactSchema', () => {
  it('turns blanks into null and an empty emergency contact into null', () => {
    expect(schema.parse(values({ current_address: '  HSR Layout ' }))).toEqual({
      personal_email: null,
      phone_number: null,
      phone_extension: '+91',
      current_address: 'HSR Layout',
      permanent_address: null,
      emergency_contact: null,
    });
  });

  it('keeps a complete emergency contact', () => {
    const parsed = schema.parse(values({ emergency_name: ' Ravi ', emergency_relation: '', emergency_phone_number: '9876500000' }));
    expect(parsed.emergency_contact).toEqual({ name: 'Ravi', relation: null, phone_number: '9876500000', phone_extension: '+91' });
  });

  it('refuses half an emergency contact, naming the missing field', () => {
    expect(issues(values({ emergency_name: 'Ravi' }))).toEqual(['emergency_phone_number:hrEmployee.form.emergencyPhoneRequired']);
    expect(issues(values({ emergency_phone_number: '9876500000' }))).toEqual(['emergency_name:hrEmployee.form.emergencyNameRequired']);
  });

  it('refuses a malformed email, phone or dial code', () => {
    expect(issues(values({ personal_email: 'meera@' }))).toEqual(['personal_email:hrEmployee.form.emailInvalid']);
    expect(issues(values({ phone_number: '12-34' }))).toEqual(['phone_number:hrEmployee.form.phoneInvalid']);
    expect(issues(values({ phone_extension: '91x' }))).toEqual(['phone_extension:hrEmployee.form.dialCodeInvalid']);
  });

  it('bounds the address length', () => {
    expect(issues(values({ current_address: 'x'.repeat(501) }))).toEqual(['current_address:hrEmployee.form.tooLong:500']);
  });
});

describe('hrContactValuesFrom', () => {
  it('fills the form from a stored record, defaulting the dial codes', () => {
    expect(
      hrContactValuesFrom({
        personal_email: 'meera@x.com',
        phone_number: null,
        phone_extension: null,
        emergency_contact: { name: 'Ravi', relation: 'Brother', phone_number: '98765', phone_extension: '+44' },
      })
    ).toEqual({
      ...hrContactDefaults,
      personal_email: 'meera@x.com',
      emergency_name: 'Ravi',
      emergency_relation: 'Brother',
      emergency_phone_number: '98765',
      emergency_phone_extension: '+44',
    });
  });
});
