import { describe, expect, it } from 'vitest';

import { promptFormSchema, promptInitialValues } from '../src/schema';
import type { PromptVariable } from '../src/types';

const valid = (over: Record<string, unknown> = {}) => ({
  name: 'Navigation Knowledge Bot',
  key: 'navigation-bot',
  description: 'Answers where a page lives.',
  category: 'Navigation',
  target_model: 'claude-opus-5',
  content: 'Use {{navigation_map}} to answer {{user_question}}.',
  is_active: true,
  ...over,
});

const errorsFor = (input: unknown, variables: readonly PromptVariable[] = []) => {
  const result = promptFormSchema(variables).safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.') || '_root', i.message]));
};

describe('promptInitialValues', () => {
  it('opens a live prompt in the General category', () => {
    expect(promptInitialValues).toEqual({
      name: '',
      key: '',
      description: '',
      category: 'General',
      target_model: '',
      content: '',
      is_active: true,
    });
  });
});

describe('the name field', () => {
  it('accepts a real name', () => {
    expect(promptFormSchema().safeParse(valid()).success).toBe(true);
  });

  it('needs two characters and caps at eighty', () => {
    expect(errorsFor(valid({ name: 'a' })).name).toBe('Name must be at least 2 characters');
    expect(errorsFor(valid({ name: 'a'.repeat(81) })).name).toBe('Keep the name under 80 characters');
  });
});

describe('the key field', () => {
  it('is optional — an AI prompt has no call site to address it by', () => {
    expect(promptFormSchema().safeParse(valid({ key: '' })).success).toBe(true);
  });

  it('accepts the URL-safe shape it goes into a URL as', () => {
    expect(promptFormSchema().safeParse(valid({ key: 'ask-bot.navigation.v2' })).success).toBe(true);
  });

  it.each([['Navigation'], ['ask bot'], ['ask_bot'], ['ask/bot']])('rejects %j', (key) => {
    expect(errorsFor(valid({ key }))).toHaveProperty('key');
  });

  it('caps the key at eighty characters', () => {
    expect(errorsFor(valid({ key: 'a'.repeat(81) })).key).toBe('Keep the key under 80 characters');
  });
});

describe('the optional text fields', () => {
  it.each([
    ['description', 200, 'Keep the description under 200 characters'],
    ['category', 40, 'Keep the category under 40 characters'],
    ['target_model', 60, 'Keep the model under 60 characters'],
  ] as const)('caps %s at %i characters', (field, max, message) => {
    expect(errorsFor(valid({ [field]: 'a'.repeat(max + 1) }))[field]).toBe(message);
    expect(promptFormSchema().safeParse(valid({ [field]: 'a'.repeat(max) })).success).toBe(true);
  });
});

describe('the content field', () => {
  it('needs enough to be a prompt at all', () => {
    expect(errorsFor(valid({ content: 'too short' })).content).toBe('Add at least 10 characters of prompt content');
  });

  it('caps at twenty thousand characters', () => {
    expect(errorsFor(valid({ content: 'a'.repeat(20_001) })).content).toBe(
      'Prompt is too long (max 20000 characters)'
    );
  });
});

describe('the required-placeholder rule', () => {
  const variables = [
    { name: 'navigation_map', required: true },
    { name: 'user_question', required: true },
  ] as PromptVariable[];

  it('refuses a body that dropped a placeholder its call site fills in', () => {
    const message = errorsFor(valid({ content: 'Answer {{user_question}} from memory.' }), variables).content;

    expect(message).toContain('{{navigation_map}}');
    expect(message).toContain('runs with the facts missing');
  });

  it('names every missing placeholder at once', () => {
    const message = errorsFor(valid({ content: 'Nothing interpolated here.' }), variables).content;

    expect(message).toContain('{{navigation_map}}');
    expect(message).toContain('{{user_question}}');
  });

  it('accepts the body once the placeholders are back', () => {
    expect(promptFormSchema(variables).safeParse(valid()).success).toBe(true);
  });

  it('applies no such rule to a prompt with no declared variables — that is an AI prompt', () => {
    expect(promptFormSchema().safeParse(valid({ content: 'Write a friendly reply.' })).success).toBe(true);
  });
});
