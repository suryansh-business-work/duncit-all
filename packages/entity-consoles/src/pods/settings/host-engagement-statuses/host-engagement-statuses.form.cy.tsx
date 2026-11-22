import { describe, expect, it } from 'vitest';
import { ADMIN_BUNDLE, createTranslator, flattenCatalogue } from '@duncit/app-settings';
import { buildStatusesSchema, toStatusesInput } from './host-engagement-statuses.schema';

const t = createTranslator({ locale: 'en-IN', fallback: flattenCatalogue(ADMIN_BUNDLE) }).t;
const INVALID = 'Every status needs a label of up to 40 characters, and at least one must stay offered.';

const SAVED = [
  { key: 'NOT_CONTACTED', label: 'Not Contacted', is_active: true },
  { key: 'CONTACTED', label: 'Contacted', is_active: true },
  { key: 'INACTIVE', label: 'Inactive', is_active: false },
];

const messagesOf = (statuses: unknown) => {
  const result = buildStatusesSchema(t).safeParse({ statuses });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('buildStatusesSchema', () => {
  it('accepts the saved list', () => {
    expect(messagesOf(SAVED)).toEqual([]);
  });

  it('refuses a blank or over-long label', () => {
    expect(messagesOf([{ key: '', label: '  ', is_active: true }])).toContain(INVALID);
    expect(messagesOf([{ key: '', label: 'x'.repeat(41), is_active: true }])).toContain(INVALID);
    expect(messagesOf([{ key: '', label: 'x'.repeat(40), is_active: true }])).toEqual([]);
  });

  it('refuses a list with nothing offered', () => {
    expect(messagesOf(SAVED.map((row) => ({ ...row, is_active: false })))).toContain(INVALID);
  });

  it('refuses more than twenty statuses', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ key: '', label: `S${i}`, is_active: true }));
    expect(messagesOf(many)).toContain('At most 20 statuses can be configured.');
  });
});

describe('toStatusesInput', () => {
  it('keeps saved keys, sends new rows without one and trims labels', () => {
    expect(
      toStatusesInput({
        statuses: [
          { key: 'CONTACTED', label: ' Spoke ', is_active: true },
          { key: '', label: 'Needs a venue', is_active: false },
        ],
      })
    ).toEqual({
      host_engagement_statuses: [
        { key: 'CONTACTED', label: 'Spoke', is_active: true },
        { label: 'Needs a venue', is_active: false },
      ],
    });
  });
});
