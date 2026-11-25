import { describe, expect, it } from 'vitest';
import { CALL_PROMPT_LANGUAGES, callPromptDefaults, makeCallPromptSchema } from '../src/schemas';

/** A Static Content prompt: the key is echoed, so each assertion names the message shown. */
const schema = makeCallPromptSchema((key) => key);
const messages = (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};
const valid = { ...callPromptDefaults, name: 'Venue pitch', context: 'Introduce Duncit pods to the venue owner.' };

describe('makeCallPromptSchema', () => {
  it('accepts a prompt with a name and enough context, trimming both', () => {
    expect(schema.parse({ ...valid, name: '  Venue pitch ' }).name).toBe('Venue pitch');
  });

  it('asks for a longer name and context, and caps every field', () => {
    expect(messages(callPromptDefaults)).toEqual(['crm.callPrompts.nameMin', 'crm.callPrompts.contextMin']);
    expect(messages({ ...valid, name: 'x'.repeat(81) })).toEqual(['crm.callPrompts.nameMax']);
    expect(messages({ ...valid, description: 'x'.repeat(201) })).toEqual(['crm.callPrompts.descriptionMax']);
    expect(messages({ ...valid, context: 'x'.repeat(5001) })).toEqual(['crm.callPrompts.contextMax']);
    expect(messages({ ...valid, language: '' })).toEqual(['crm.callPrompts.languageRequired']);
  });

  it('offers auto-detect first, then the Indian languages the agent speaks', () => {
    expect(CALL_PROMPT_LANGUAGES[0]?.value).toBe('auto');
    expect(CALL_PROMPT_LANGUAGES.map((l) => l.value)).toContain('hi-IN');
  });
});
