import { describe, expect, it } from 'vitest';
import {
  interviewBookingFormSchema,
  makeInterviewDetailsSchema,
  toInterviewBookingInput,
} from './interview-booking.form';

const base = {
  type: 'HOST' as const,
  applicant_name: 'Jane Doe',
  applicant_email: 'jane@example.com',
  applicant_phone_extension: '+91',
  applicant_phone_number: '9876543210',
  business_name: '',
  business_address: '',
  city: '',
  zone: '',
  about: 'Looking to host pods around Bengaluru.',
  preferred_slots: [{ start: '2026-01-10T10:00:00Z', end: '2026-01-10T11:00:00Z' }],
};

/** Every message a parse failed with, joined — the schema reports all of them. */
const errorsOf = (value: unknown) => {
  const result = interviewBookingFormSchema.safeParse(value);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('interviewBookingFormSchema', () => {
  it('accepts a valid booking', () => {
    expect(interviewBookingFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects names with special chars', () => {
    expect(errorsOf({ ...base, applicant_name: 'Jane!' })).toMatch(/name/i);
  });

  it('holds every name field to the same shape as signup — @duncit/regex PERSON_NAME', () => {
    // Digits and underscores are what this pattern exists to keep out of a name
    // the server then splits into first_name and last_name.
    expect(errorsOf({ ...base, applicant_name: 'Doe_123' })).toMatch(/name/i);
    expect(interviewBookingFormSchema.safeParse({ ...base, applicant_name: "O'Brien" }).success).toBe(
      true,
    );
  });

  it('rejects phone with letters', () => {
    expect(errorsOf({ ...base, applicant_phone_number: 'abc' })).toMatch(/digits/i);
  });

  it('rejects a dial code that is not one', () => {
    expect(errorsOf({ ...base, applicant_phone_extension: '+911111' })).toMatch(/code/i);
  });

  it('rejects an address the shared EMAIL pattern refuses', () => {
    expect(errorsOf({ ...base, applicant_email: 'jane@example' })).toMatch(/email/i);
    expect(errorsOf({ ...base, applicant_email: 'jane doe@example.com' })).toMatch(/email/i);
  });

  it('rejects short about', () => {
    expect(errorsOf({ ...base, about: 'hi' })).toMatch(/10\+ characters|about/i);
  });

  it('rejects empty slot list', () => {
    expect(errorsOf({ ...base, preferred_slots: [] })).toMatch(/slot/i);
  });

  it('rejects end <= start in any slot', () => {
    expect(
      errorsOf({
        ...base,
        preferred_slots: [{ start: '2026-01-10T10:00:00Z', end: '2026-01-10T09:00:00Z' }],
      }),
    ).toMatch(/end must be after start/i);
  });

  it('rejects a slot whose times are not dates', () => {
    expect(
      errorsOf({ ...base, preferred_slots: [{ start: 'soon', end: 'later' }] }),
    ).toMatch(/valid date/i);
  });

  it('rejects more than five slots — nobody offers a sixth', () => {
    const slots = Array.from({ length: 6 }, (_, i) => ({
      start: `2026-01-1${i}T10:00:00Z`,
      end: `2026-01-1${i}T11:00:00Z`,
    }));
    expect(errorsOf({ ...base, preferred_slots: slots })).toMatch(/5 time slots/i);
  });

  it('rejects a type the page does not offer', () => {
    expect(errorsOf({ ...base, type: 'PARTNER' })).toMatch(/valid type/i);
  });
});

describe('makeInterviewDetailsSchema', () => {
  it('is the boxes only — the calendar is not a field, so it asks for no slots', () => {
    const { type, preferred_slots, ...details } = base;
    expect(makeInterviewDetailsSchema().safeParse(details).success).toBe(true);
  });

  it('names each empty required box rather than calling the form invalid', () => {
    const result = makeInterviewDetailsSchema().safeParse({
      applicant_name: '',
      applicant_email: '',
      applicant_phone_extension: '+91',
      applicant_phone_number: '',
      business_name: '',
      business_address: '',
      city: '',
      zone: '',
      about: '',
    });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths).toContain('applicant_name');
    expect(paths).toContain('applicant_email');
    expect(paths).toContain('applicant_phone_number');
    expect(paths).toContain('about');
  });
});

describe('toInterviewBookingInput', () => {
  it('serialises slots to ISO strings', () => {
    const input = toInterviewBookingInput(base);
    expect(input.applicant_phone).toBe('+91 9876543210');
    expect(input.preferred_slots[0].start.endsWith('Z')).toBe(true);
  });

  it('lowercases the email and sends the optional boxes as null when blank', () => {
    const input = toInterviewBookingInput({ ...base, applicant_email: 'Jane@Example.com' });
    expect(input.applicant_email).toBe('jane@example.com');
    expect(input.business_name).toBeNull();
    expect(input.city).toBeNull();
  });
});
