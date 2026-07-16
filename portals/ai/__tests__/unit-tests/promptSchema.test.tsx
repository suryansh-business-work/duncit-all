import { describe, expect, it } from 'vitest';
import { promptSchema } from '../../src/forms/prompt/prompt.form';
import { promptInitialValues } from '../../src/forms/prompt/prompt.types';

const valid = {
  ...promptInitialValues,
  name: 'Summarizer',
  content: 'Summarize the following article in three concise bullet points.',
};

const messages = (result: ReturnType<typeof promptSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('promptSchema', () => {
  it('accepts a valid prompt', () => {
    expect(promptSchema.parse(valid)).toMatchObject({ name: 'Summarizer' });
  });

  it('requires a name and content', () => {
    const result = promptSchema.safeParse({ ...promptInitialValues, name: '', content: '' });
    expect(messages(result)).toMatch(/name is required/i);
    expect(messages(result)).toMatch(/content is required/i);
  });

  it('rejects a name that is a single character', () => {
    const result = promptSchema.safeParse({ ...valid, name: 'x' });
    expect(messages(result)).toMatch(/at least 2 characters/i);
  });

  it('rejects content that is too short', () => {
    const result = promptSchema.safeParse({ ...valid, content: 'hi' });
    expect(messages(result)).toMatch(/at least 10 characters/i);
  });

  it('rejects a name that is too long', () => {
    const result = promptSchema.safeParse({ ...valid, name: 'x'.repeat(90) });
    expect(messages(result)).toMatch(/under 80 characters/i);
  });

  it('rejects an over-long description, category, model and content', () => {
    const result = promptSchema.safeParse({
      ...valid,
      description: 'x'.repeat(201),
      category: 'x'.repeat(41),
      target_model: 'x'.repeat(61),
      content: 'x'.repeat(20001),
    });
    expect(messages(result)).toMatch(/under 200 characters/i);
    expect(messages(result)).toMatch(/under 40 characters/i);
    expect(messages(result)).toMatch(/under 60 characters/i);
    expect(messages(result)).toMatch(/too long/i);
  });

  it('supplies defaults for the optional fields', () => {
    const parsed = promptSchema.parse({ name: 'Nm', content: 'Ten chars long content here' });
    expect(parsed.description).toBe('');
    expect(parsed.category).toBe('');
    expect(parsed.target_model).toBe('');
    expect(parsed.is_active).toBe(true);
  });
});
