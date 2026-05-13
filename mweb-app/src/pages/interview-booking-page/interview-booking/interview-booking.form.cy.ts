import { describe, expect, it } from 'vitest';
import { interviewBookingFormSchema, toInterviewBookingInput } from './interview-booking.form';

const base = {
  type: 'HOST' as const,
  applicant_name: 'Jane Doe',
  applicant_email: 'jane@example.com',
  applicant_phone: '9876543210',
  business_name: '',
  business_address: '',
  city: '',
  zone: '',
  about: 'Looking to host pods around Bengaluru.',
  preferred_slots: [
    { start: '2026-01-10T10:00:00Z', end: '2026-01-10T11:00:00Z' },
  ],
};

describe('interviewBookingFormSchema', () => {
  it('rejects names with special chars', async () => {
    const error = await interviewBookingFormSchema
      .validate({ ...base, applicant_name: 'Jane!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/name/i);
  });
  it('rejects phone with letters', async () => {
    const error = await interviewBookingFormSchema
      .validate({ ...base, applicant_phone: 'abc' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });
  it('rejects short about', async () => {
    const error = await interviewBookingFormSchema
      .validate({ ...base, about: 'hi' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/10\+ characters|about/i);
  });
  it('rejects empty slot list', async () => {
    const error = await interviewBookingFormSchema
      .validate({ ...base, preferred_slots: [] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/slot/i);
  });
  it('rejects end <= start in any slot', async () => {
    const error = await interviewBookingFormSchema
      .validate(
        {
          ...base,
          preferred_slots: [{ start: '2026-01-10T10:00:00Z', end: '2026-01-10T09:00:00Z' }],
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/end must be after start/i);
  });
  it('accepts a valid booking', async () => {
    await interviewBookingFormSchema.validate(base);
  });
});

describe('toInterviewBookingInput', () => {
  it('serialises slots to ISO strings', () => {
    const input = toInterviewBookingInput(base);
    expect(input.preferred_slots[0].start.endsWith('Z')).toBe(true);
  });
});
