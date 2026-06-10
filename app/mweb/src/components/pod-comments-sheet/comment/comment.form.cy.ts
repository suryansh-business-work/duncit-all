import { describe, expect, it } from 'vitest';
import { commentFormSchema, toCommentInput } from './comment.form';

describe('commentFormSchema', () => {
  it('rejects empty comment', async () => {
    const error = await commentFormSchema.validate({ text: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/comment/i);
  });
  it('rejects whitespace-only comment', async () => {
    const error = await commentFormSchema.validate({ text: '    ' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/comment/i);
  });
  it('rejects over 1000 characters', async () => {
    const error = await commentFormSchema.validate({ text: 'a'.repeat(1001) }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/1000/);
  });
  it('accepts a valid comment', async () => {
    await expect(commentFormSchema.validate({ text: 'Looks great!' })).resolves.toBeTruthy();
  });
});

describe('toCommentInput', () => {
  it('trims input', () => {
    expect(toCommentInput({ text: '   hi   ' }).text).toBe('hi');
  });
});
