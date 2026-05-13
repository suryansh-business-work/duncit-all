import { describe, expect, it } from 'vitest';
import {
  buildContactActionSchema,
  contactActionInitialValues,
  toRecordContactInput,
} from './contact-action.form';

describe('contact action schema (CALL)', () => {
  const schema = buildContactActionSchema('CALL');

  it('accepts a valid call with empty recording url', async () => {
    const parsed = await schema.validate(contactActionInitialValues, { abortEarly: false });
    expect(parsed.status).toBe('LOGGED');
  });

  it('rejects status that is not in the CALL enum', async () => {
    const error = await schema
      .validate({ ...contactActionInitialValues, status: 'SENT' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/status/i);
  });

  it('rejects recording url that is not http(s)', async () => {
    const error = await schema
      .validate({ ...contactActionInitialValues, recording_url: 'ftp://example.com/x' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/http/i);
  });

  it('rejects negative duration', async () => {
    const error = await schema
      .validate({ ...contactActionInitialValues, duration_seconds: -1 }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/negative/i);
  });
});

describe('contact action schema (EMAIL)', () => {
  const schema = buildContactActionSchema('EMAIL');

  it('rejects status that is not in the EMAIL enum', async () => {
    const error = await schema
      .validate({ ...contactActionInitialValues, status: 'CONNECTED' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/status/i);
  });
});

describe('toRecordContactInput', () => {
  it('strips email-only subject when type is CALL', () => {
    const input = toRecordContactInput(
      { ...contactActionInitialValues, subject: 'hello' },
      'u1',
      'CALL',
      '+919876543210',
    );
    expect(input.subject).toBe('');
    expect(input.user_id).toBe('u1');
    expect(input.target).toBe('+919876543210');
  });

  it('strips call-only duration/recording when type is EMAIL', () => {
    const input = toRecordContactInput(
      { ...contactActionInitialValues, duration_seconds: 30, recording_url: 'https://x' },
      'u1',
      'EMAIL',
      'a@b.co',
    );
    expect(input.duration_seconds).toBe(0);
    expect(input.recording_url).toBe('');
  });
});
