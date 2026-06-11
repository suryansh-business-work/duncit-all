import { describe, expect, it } from 'vitest';
import {
  interviewFormSchema,
  interviewInitialValues,
  toUpdateInterviewInput,
} from './interview.form';

describe('interviewFormSchema', () => {
  it('rejects an invalid status', async () => {
    const error = await interviewFormSchema
      .validate(
        { status: 'XXX' as any, pickedSlotIdx: -1, customStart: '', customEnd: '', meetingLink: '', notes: '' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/status/i);
  });

  it('requires start/end when SCHEDULED', async () => {
    const error = await interviewFormSchema
      .validate(
        { status: 'SCHEDULED', pickedSlotIdx: -1, customStart: '', customEnd: '', meetingLink: '', notes: '' },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/start/i);
    expect(error.errors.join(' ')).toMatch(/end/i);
  });

  it('rejects end-before-start when SCHEDULED', async () => {
    const error = await interviewFormSchema
      .validate(
        {
          status: 'SCHEDULED',
          pickedSlotIdx: -1,
          customStart: '2025-06-10T15:00',
          customEnd: '2025-06-10T14:00',
          meetingLink: '',
          notes: '',
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/end must be after start/i);
  });

  it('rejects meeting link that is not http(s)', async () => {
    const error = await interviewFormSchema
      .validate(
        {
          status: 'PENDING',
          pickedSlotIdx: -1,
          customStart: '',
          customEnd: '',
          meetingLink: 'mailto:x@y',
          notes: '',
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/http/i);
  });
});

describe('toUpdateInterviewInput', () => {
  it('includes scheduled_slot only for SCHEDULED / APPROVED', () => {
    const noSchedule = toUpdateInterviewInput({
      status: 'PENDING',
      pickedSlotIdx: -1,
      customStart: '',
      customEnd: '',
      meetingLink: '',
      notes: '',
    });
    expect(noSchedule.scheduled_slot).toBeUndefined();

    const withSchedule = toUpdateInterviewInput({
      status: 'APPROVED',
      pickedSlotIdx: 0,
      customStart: '2025-06-10T14:00',
      customEnd: '2025-06-10T15:00',
      meetingLink: 'https://meet.google.com/abc',
      notes: '',
    });
    expect(withSchedule.scheduled_slot).toBeDefined();
    expect(withSchedule.meeting_link).toBe('https://meet.google.com/abc');
  });
});

describe('interviewInitialValues', () => {
  it('returns sane defaults when interview is null', () => {
    const values = interviewInitialValues(null);
    expect(values.status).toBe('SCHEDULED');
    expect(values.customStart).toBe('');
  });

  it('seeds from a scheduled slot when present', () => {
    const values = interviewInitialValues({
      status: 'APPROVED',
      scheduled_slot: { start: '2025-06-10T14:00:00Z', end: '2025-06-10T15:00:00Z' },
      preferred_slots: [],
      meeting_link: 'https://meet',
      admin_notes: 'note',
    });
    expect(values.status).toBe('APPROVED');
    expect(values.customStart).toContain('2025-06-10');
  });
});
