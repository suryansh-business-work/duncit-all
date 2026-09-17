import { describe, expect, it } from 'vitest';
import {
  emailTemplateCreateSchema,
  slugify,
  toCreateTemplateInput,
} from '../../src/pages/email-templates-page/email-template-create/email-template-create.form';

const firstError = (result: ReturnType<typeof emailTemplateCreateSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('emailTemplateCreateSchema', () => {
  it('rejects slug with spaces', () => {
    const result = emailTemplateCreateSchema.safeParse({ slug: 'hello world', name: 'Welcome', subject: 'Welcome' });
    expect(firstError(result)).toMatch(/slug/i);
  });
  it('rejects uppercase slug', () => {
    const result = emailTemplateCreateSchema.safeParse({ slug: 'Welcome', name: 'Welcome', subject: 'Welcome' });
    expect(firstError(result)).toMatch(/slug/i);
  });
  it('rejects short subject', () => {
    const result = emailTemplateCreateSchema.safeParse({ slug: 'welcome', name: 'Welcome', subject: 'A' });
    expect(firstError(result)).toMatch(/subject/i);
  });
  it('accepts a fully valid template', () => {
    expect(
      emailTemplateCreateSchema.safeParse({ slug: 'welcome-email', name: 'Welcome Email', subject: 'Welcome' }).success,
    ).toBe(true);
  });
});

describe('slugify helper', () => {
  it('produces a kebab-case slug from arbitrary input', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  Trim Me  ')).toBe('trim-me');
  });
});

describe('toCreateTemplateInput', () => {
  it('casts and trims the create payload to slug/name/subject', () => {
    expect(
      toCreateTemplateInput({ slug: 'welcome-email', name: '  Welcome  ', subject: '  Hello  ' }),
    ).toEqual({ slug: 'welcome-email', name: 'Welcome', subject: 'Hello' });
  });
});
