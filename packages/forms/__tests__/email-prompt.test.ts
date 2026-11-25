import { describe, expect, it } from 'vitest';
import { EMAIL_PROMPT_MAX, emailPromptPlaceholders, makeEmailPromptSchema } from '../src/schemas/email-prompt';

/** A CRM email AI prompt: the key is echoed with its vars, so a message names what it is about. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key;

const messages = (content: string, required: readonly string[] = ['instruction', 'current_mjml']) => {
  const result = makeEmailPromptSchema(t, required).safeParse({ content });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('emailPromptPlaceholders', () => {
  it('finds every {{ name }}, with or without spaces inside the braces', () => {
    expect([...emailPromptPlaceholders('Hi {{ instruction }} and {{current_mjml}} and {{instruction}}')]).toEqual([
      'instruction',
      'current_mjml',
    ]);
  });

  it('ignores braces that never close and text with no placeholders', () => {
    expect(emailPromptPlaceholders('Write {{instruction')).toEqual(new Set());
    expect(emailPromptPlaceholders('')).toEqual(new Set());
  });
});

describe('makeEmailPromptSchema', () => {
  it('accepts a body that keeps every required placeholder, and any body when none is required', () => {
    expect(messages('Do {{ instruction }} on {{current_mjml}}')).toEqual([]);
    expect(messages('Write a friendly email', [])).toEqual([]);
  });

  it('names each required placeholder that was removed', () => {
    expect(messages('Do {{instruction}}')).toEqual(['crm.emailSettings.promptMissingVariables:{{current_mjml}}']);
    expect(messages('Just write an email')).toEqual([
      'crm.emailSettings.promptMissingVariables:{{instruction}}, {{current_mjml}}',
    ]);
  });

  it('refuses a blank body', () => {
    expect(messages('   \n ', [])).toEqual(['crm.emailSettings.promptRequired']);
  });

  it(`allows exactly ${EMAIL_PROMPT_MAX} characters after trimming, and no more`, () => {
    const tail = '{{instruction}}';
    const atLimit = 'x'.repeat(EMAIL_PROMPT_MAX - tail.length) + tail;
    expect(messages(`   ${atLimit}  `, ['instruction'])).toEqual([]);
    expect(messages(`x${atLimit}`, ['instruction'])).toEqual([`crm.emailSettings.promptTooLong:${EMAIL_PROMPT_MAX}`]);
  });
});
