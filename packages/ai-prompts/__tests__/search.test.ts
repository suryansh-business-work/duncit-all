import { describe, expect, it } from 'vitest';

import { promptSearchText } from '../src/search';
import type { AiPrompt } from '../src/types';

const prompt = (over: Partial<AiPrompt> = {}): AiPrompt =>
  (({
    id: 'p1',
    key: 'ask-bot.navigation',
    kind: 'CODE',
    role: 'SYSTEM',
    name: 'Navigation Knowledge Bot',
    description: 'Answers where a page lives.',
    content: 'Use {{navigation_map}} to answer the question.',
    category: 'Navigation',
    target_model: 'claude-opus-5',
    variables: [],
    tasks: [],
    usage: [],
    token_count: 42,
    is_active: true,
    ...over
  }) as AiPrompt);

describe('promptSearchText', () => {
  it('searches the BODY too — an operator remembers a sentence, not a row name', () => {
    expect(promptSearchText(prompt())).toContain('navigation_map');
  });

  it('carries every field the search placeholder promises', () => {
    const text = promptSearchText(prompt());

    for (const part of [
      'Navigation Knowledge Bot',
      'ask-bot.navigation',
      'Navigation',
      'Answers where a page lives.',
      'claude-opus-5',
    ]) {
      expect(text).toContain(part);
    }
  });

  it('reads a missing key or description as empty, never as "null"', () => {
    const text = promptSearchText(prompt({ key: null, description: null }));

    expect(text).not.toContain('null');
    expect(text).toContain('Navigation Knowledge Bot');
  });

  it('separates the fields so a term cannot match across two of them', () => {
    // "Bot ask" would match a naive concatenation of name + key.
    expect(promptSearchText(prompt()).includes('Botask')).toBe(false);
  });
});
