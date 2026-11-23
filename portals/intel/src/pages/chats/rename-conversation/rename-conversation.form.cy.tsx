import { describe, expect, it } from 'vitest';
import { makeRenameSchema, TITLE_MAX } from './rename-conversation.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key);
const schema = makeRenameSchema(t);
const issues = (title: string) => {
  const result = schema.safeParse({ title });
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('rename conversation validation', () => {
  it('trims the title it accepts', () => {
    expect(schema.parse({ title: '  Pod earnings  ' })).toEqual({ title: 'Pod earnings' });
  });

  it('refuses a blank title with the required message', () => {
    expect(issues('   ')).toEqual(['intel.chats.rename.required']);
  });

  it('accepts exactly the maximum length and refuses one character more', () => {
    expect(issues('x'.repeat(TITLE_MAX))).toEqual([]);
    expect(issues('x'.repeat(TITLE_MAX + 1))).toEqual([`intel.chats.rename.tooLong({"max":${TITLE_MAX}})`]);
  });
});
