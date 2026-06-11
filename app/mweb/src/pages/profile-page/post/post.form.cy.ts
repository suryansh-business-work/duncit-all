import { describe, expect, it } from 'vitest';
import { postFormSchema, toPostInput } from './post.form';

const valid = { text: 'Hello world', media: [], visibility: 'PUBLIC' as const };

describe('postFormSchema', () => {
  it('rejects empty post', async () => {
    const error = await postFormSchema
      .validate({ text: '', media: [], visibility: 'PUBLIC' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/text or media/i);
  });
  it('rejects bad media URL', async () => {
    const error = await postFormSchema
      .validate({ text: '', media: ['not-a-url'], visibility: 'PUBLIC' as const }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/media/i);
  });
  it('rejects too many media items', async () => {
    const error = await postFormSchema
      .validate(
        {
          text: '',
          media: Array.from({ length: 11 }, (_, i) => `https://x/${i}.png`),
          visibility: 'PUBLIC' as const,
        },
        { abortEarly: false },
      )
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/10/);
  });
  it('rejects bad visibility', async () => {
    const error = await postFormSchema
      .validate({ ...valid, visibility: 'INVALID' as any }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/visibility/i);
  });
  it('accepts valid input', async () => {
    await expect(postFormSchema.validate(valid)).resolves.toBeTruthy();
  });
});

describe('toPostInput', () => {
  it('nullifies empty text', () => {
    const input = toPostInput({ text: '', media: ['https://x/a.png'], visibility: 'PUBLIC' });
    expect(input.text).toBeNull();
  });
});
