import { describe, expect, it } from 'vitest';
import { postFormSchema, toPostInput } from './post.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

const valid = { text: 'Hello world', media: [], visibility: 'PUBLIC' as const };

describe('postFormSchema', () => {
  it('rejects empty post', () => {
    const result = postFormSchema.safeParse({ text: '', media: [], visibility: 'PUBLIC' });
    expect(errorText(result)).toMatch(/text or media/i);
  });
  it('rejects bad media URL', () => {
    const result = postFormSchema.safeParse({ text: '', media: ['not-a-url'], visibility: 'PUBLIC' as const });
    expect(errorText(result)).toMatch(/media/i);
  });
  it('rejects too many media items', () => {
    const result = postFormSchema.safeParse({
      text: '',
      media: Array.from({ length: 11 }, (_, i) => `https://x/${i}.png`),
      visibility: 'PUBLIC' as const,
    });
    expect(errorText(result)).toMatch(/10/);
  });
  it('rejects bad visibility', () => {
    const result = postFormSchema.safeParse({ ...valid, visibility: 'INVALID' as any });
    expect(errorText(result)).toMatch(/visibility/i);
  });
  it('accepts valid input', () => {
    expect(postFormSchema.safeParse(valid).success).toBe(true);
  });
});

describe('toPostInput', () => {
  it('nullifies empty text', () => {
    const input = toPostInput({ text: '', media: ['https://x/a.png'], visibility: 'PUBLIC' });
    expect(input.text).toBeNull();
  });
});
