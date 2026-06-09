import { describe, expect, it } from 'vitest';
import { emailTemplateCreateSchema, slugify } from './email-template-create.form';

describe('emailTemplateCreateSchema', () => {
  it('rejects slug with spaces', async () => {
    const error = await emailTemplateCreateSchema
      .validate({ slug: 'hello world', name: 'Welcome', subject: 'Welcome' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/slug/i);
  });
  it('rejects uppercase slug', async () => {
    const error = await emailTemplateCreateSchema
      .validate({ slug: 'Welcome', name: 'Welcome', subject: 'Welcome' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/slug/i);
  });
  it('rejects short subject', async () => {
    const error = await emailTemplateCreateSchema
      .validate({ slug: 'welcome', name: 'Welcome', subject: 'A' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/subject/i);
  });
  it('accepts a fully valid template', async () => {
    await expect(
      emailTemplateCreateSchema.validate({ slug: 'welcome-email', name: 'Welcome Email', subject: 'Welcome' }),
    ).resolves.toBeTruthy();
  });
});

describe('slugify helper', () => {
  it('produces a kebab-case slug from arbitrary input', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  Trim Me  ')).toBe('trim-me');
  });
});
