import { describe, expect, it } from 'vitest';
import { promptSchema } from './prompt.form';
import { promptInitialValues } from './prompt.types';

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

  it('rejects content that is too short', () => {
    const result = promptSchema.safeParse({ ...valid, content: 'hi' });
    expect(messages(result)).toMatch(/at least 10 characters/i);
  });

  it('rejects a name that is too long', () => {
    const result = promptSchema.safeParse({ ...valid, name: 'x'.repeat(90) });
    expect(messages(result)).toMatch(/under 80 characters/i);
  });
});
