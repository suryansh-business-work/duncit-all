import { describe, expect, it } from 'vitest';
import { braced, makeEmailTemplateSchema, templateValuesFrom } from '../../../../pages/email-templates/email-template';
import { makeTemplate } from '../../../fixtures';
import { portalT } from '../../../test-utils';

const schema = makeEmailTemplateSchema(portalT);
const VALID = templateValuesFrom(makeTemplate());
const firstMessage = (over: Partial<typeof VALID>) => schema.safeParse({ ...VALID, ...over }).error?.issues[0]?.message;

describe('email template values', () => {
  it('edits only the subject, body and enabled flag', () => {
    expect(VALID).toEqual({ subject: 'You are going to {event_title}', body: 'Hi {guest_name}, see you there.', enabled: true });
  });

  it('wraps a placeholder name in braces', () => {
    expect(braced('guest_name')).toBe('{guest_name}');
  });
});

describe('makeEmailTemplateSchema', () => {
  it('accepts the stored template', () => {
    expect(schema.safeParse(VALID).success).toBe(true);
  });

  it('requires a subject of at most 200 characters', () => {
    expect(firstMessage({ subject: '  ' })).toBe('Subject is required');
    expect(firstMessage({ subject: 's'.repeat(200) })).toBeUndefined();
    expect(firstMessage({ subject: 's'.repeat(201) })).toBe('Subject must be 200 characters or fewer');
  });

  it('requires a body of at most 5000 characters', () => {
    expect(firstMessage({ body: '' })).toBe('Body is required');
    expect(firstMessage({ body: 'b'.repeat(5000) })).toBeUndefined();
    expect(firstMessage({ body: 'b'.repeat(5001) })).toBe('Body must be 5000 characters or fewer');
  });
});
