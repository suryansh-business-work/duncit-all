import { describe, expect, it } from 'vitest';
import { commentFormSchema, toCommentInput } from './comment.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

describe('commentFormSchema', () => {
  it('rejects empty comment', () => {
    expect(errorText(commentFormSchema.safeParse({ text: '' }))).toMatch(/comment/i);
  });
  it('rejects whitespace-only comment', () => {
    expect(errorText(commentFormSchema.safeParse({ text: '    ' }))).toMatch(/comment/i);
  });
  it('rejects over 1000 characters', () => {
    expect(errorText(commentFormSchema.safeParse({ text: 'a'.repeat(1001) }))).toMatch(/1000/);
  });
  it('accepts a valid comment', () => {
    expect(commentFormSchema.safeParse({ text: 'Looks great!' }).success).toBe(true);
  });
});

describe('toCommentInput', () => {
  it('trims input', () => {
    expect(toCommentInput({ text: '   hi   ' }).text).toBe('hi');
  });
});
