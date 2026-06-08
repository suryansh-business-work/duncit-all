import { describe, expect, it } from 'vitest';
import { promptSchema } from './prompt.form';
import { promptInitialValues } from './prompt.types';

const valid = {
  ...promptInitialValues,
  name: 'Summarizer',
  content: 'Summarize the following article in three concise bullet points.',
};

describe('promptSchema', () => {
  it('accepts a valid prompt', async () => {
    await expect(promptSchema.validate(valid)).resolves.toMatchObject({ name: 'Summarizer' });
  });

  it('requires a name and content', async () => {
    const error = await promptSchema
      .validate({ ...promptInitialValues, name: '', content: '' }, { abortEarly: false })
      .catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/name is required/i);
    expect(error.errors.join(' ')).toMatch(/content is required/i);
  });

  it('rejects content that is too short', async () => {
    const error = await promptSchema.validate({ ...valid, content: 'hi' }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/at least 10 characters/i);
  });

  it('rejects a name that is too long', async () => {
    const error = await promptSchema.validate({ ...valid, name: 'x'.repeat(90) }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/under 80 characters/i);
  });
});
