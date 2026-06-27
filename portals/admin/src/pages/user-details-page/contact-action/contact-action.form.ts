import { z } from 'zod';

export type ContactType = 'CALL' | 'EMAIL';

export interface ContactActionValues {
  subject: string;
  notes: string;
  status: string;
  duration_seconds: number;
  recording_url: string;
}

export const CALL_STATUSES = ['LOGGED', 'CONNECTED', 'MISSED', 'VOICEMAIL'] as const;
export const EMAIL_STATUSES = ['LOGGED', 'SENT', 'BOUNCED', 'REPLIED'] as const;

const isHttpUrl = (value: string) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const buildContactActionSchema = (
  type: ContactType,
): z.ZodType<ContactActionValues, z.ZodTypeDef, unknown> => {
  const statuses = type === 'CALL' ? CALL_STATUSES : EMAIL_STATUSES;
  return z.object({
    subject: z.string().trim().max(160, 'Subject must be 160 characters or fewer').default(''),
    notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer').default(''),
    status: z
      .string()
      .trim()
      .refine((value) => (statuses as readonly string[]).includes(value), 'Select a valid status'),
    duration_seconds: z.coerce
      .number()
      .int('Duration must be a whole number')
      .min(0, 'Duration cannot be negative')
      .max(86_400, 'Duration cannot exceed 24 hours')
      .default(0),
    recording_url: z.string().trim().default('').refine(isHttpUrl, 'Recording URL must start with http:// or https://'),
  });
};

export const contactActionInitialValues: ContactActionValues = {
  subject: '',
  notes: '',
  status: 'LOGGED',
  duration_seconds: 0,
  recording_url: '',
};

export interface RecordContactPayload {
  user_id: string;
  type: ContactType;
  target: string;
  subject: string;
  notes: string;
  status: string;
  duration_seconds: number;
  recording_url: string;
}

export function toRecordContactInput(
  values: ContactActionValues,
  user_id: string,
  type: ContactType,
  target: string,
): RecordContactPayload {
  const cast = buildContactActionSchema(type).parse(values);
  return {
    user_id,
    type,
    target,
    subject: type === 'EMAIL' ? cast.subject : '',
    notes: cast.notes,
    status: cast.status,
    duration_seconds: type === 'CALL' ? cast.duration_seconds : 0,
    recording_url: type === 'CALL' ? cast.recording_url : '',
  };
}
