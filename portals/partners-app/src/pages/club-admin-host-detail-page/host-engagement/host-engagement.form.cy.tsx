import { describe, expect, it } from 'vitest';
import { CLUB_ADMIN_BUNDLE, createTranslator, flattenCatalogue } from '@duncit/app-settings';
import { buildEngagementSchema, engagementOptions, ENGAGEMENT_NOTE_MAX } from './host-engagement.schema';

const t = createTranslator({ locale: 'en-IN', fallback: flattenCatalogue(CLUB_ADMIN_BUNDLE) }).t;

const messagesOf = (values: Record<string, unknown>) => {
  const result = buildEngagementSchema(t).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('buildEngagementSchema', () => {
  it('accepts a status with or without a note', () => {
    expect(messagesOf({ status_key: 'CONTACTED', note: '' })).toEqual([]);
    expect(messagesOf({ status_key: 'CONTACTED', note: 'Called on Monday' })).toEqual([]);
  });

  it('requires a status', () => {
    expect(messagesOf({ status_key: '', note: '' })).toEqual(['Pick a status.']);
  });

  it('holds the note to the server limit, counting it trimmed', () => {
    expect(messagesOf({ status_key: 'A', note: 'x'.repeat(ENGAGEMENT_NOTE_MAX) })).toEqual([]);
    expect(messagesOf({ status_key: 'A', note: ` ${'x'.repeat(ENGAGEMENT_NOTE_MAX)} ` })).toEqual([]);
    expect(messagesOf({ status_key: 'A', note: 'x'.repeat(ENGAGEMENT_NOTE_MAX + 1) })).toEqual([
      'Keep the note to 1000 characters.',
    ]);
  });
});

describe('engagementOptions', () => {
  const statuses = [
    { key: 'NOT_CONTACTED', label: 'Not Contacted', is_active: true },
    { key: 'PARKED', label: 'Parked', is_active: false },
    { key: 'ACTIVE', label: 'Active', is_active: true },
  ];

  it('offers only active statuses', () => {
    expect(engagementOptions(statuses, 'ACTIVE').map((s) => s.key)).toEqual(['NOT_CONTACTED', 'ACTIVE']);
  });

  it('keeps a switched-off status the host is already filed under, in its place', () => {
    expect(engagementOptions(statuses, 'PARKED').map((s) => s.key)).toEqual(['NOT_CONTACTED', 'PARKED', 'ACTIVE']);
  });
});
