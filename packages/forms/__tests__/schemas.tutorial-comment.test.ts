import { describe, expect, it } from 'vitest';
import { TUTORIAL_COMMENT_MAX } from '@duncit/utils';
import { makeTutorialCommentSchema } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const parse = (text: unknown) => makeTutorialCommentSchema(t).safeParse({ text });
const messagesOf = (text: unknown) => {
  const result = parse(text);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('makeTutorialCommentSchema', () => {
  it('accepts a comment and hands back the trimmed text', () => {
    const result = parse('  Very helpful, thanks!  ');
    expect(result.success).toBe(true);
    expect(result.success && result.data.text).toBe('Very helpful, thanks!');
  });

  it('refuses an empty or whitespace-only comment with the translated required message', () => {
    expect(messagesOf('')).toEqual(['text:mweb.tutorials.commentRequired']);
    expect(messagesOf('   \n\t ')).toEqual(['text:mweb.tutorials.commentRequired']);
  });

  it('accepts exactly the limit and refuses one character more, naming the limit', () => {
    expect(messagesOf('a'.repeat(TUTORIAL_COMMENT_MAX))).toEqual([]);
    expect(messagesOf('a'.repeat(TUTORIAL_COMMENT_MAX + 1))).toEqual([
      `text:mweb.tutorials.commentTooLong:{"max":${TUTORIAL_COMMENT_MAX}}`,
    ]);
  });

  it('measures the limit after trimming, so padding never pushes a comment over', () => {
    expect(messagesOf(`  ${'a'.repeat(TUTORIAL_COMMENT_MAX)}  `)).toEqual([]);
  });

  it('refuses a value that is not text', () => {
    expect(parse(42).success).toBe(false);
    expect(parse(undefined).success).toBe(false);
  });
});
