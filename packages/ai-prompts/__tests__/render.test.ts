import { describe, expect, it } from 'vitest';

import {
  braced,
  estimateTokens,
  exampleValues,
  extractVariables,
  missingRequiredVariables,
  renderPrompt,
} from '../src/render';
import type { PromptVariable } from '../src/types';

const variable = (over: Partial<PromptVariable> & { name: string }): PromptVariable =>
  ({ required: false, example: '', description: '', ...over }) as PromptVariable;

describe('renderPrompt', () => {
  it('fills the placeholders it was given', () => {
    expect(renderPrompt('Hello {{name}}, welcome to {{city}}.', { name: 'Asha', city: 'Pune' })).toBe(
      'Hello Asha, welcome to Pune.'
    );
  });

  it('leaves an unsupplied placeholder exactly as written — some bodies talk ABOUT placeholders', () => {
    expect(renderPrompt('Write MJML using {{variables}} like {{first_name}}.', {})).toBe(
      'Write MJML using {{variables}} like {{first_name}}.'
    );
  });

  it('treats an empty string as a real value, not as a miss', () => {
    expect(renderPrompt('[{{note}}]', { note: '' })).toBe('[]');
  });

  it('tolerates the spacing an author leaves inside the braces', () => {
    expect(renderPrompt('{{ name }} and {{name}}', { name: 'Asha' })).toBe('Asha and Asha');
  });

  it('replaces every occurrence, not just the first', () => {
    expect(renderPrompt('{{a}}-{{a}}-{{a}}', { a: 'x' })).toBe('x-x-x');
  });

  it('does not resolve a placeholder against Object.prototype', () => {
    // A body is operator-written text; `{{constructor}}` must stay text.
    expect(renderPrompt('{{constructor}} {{toString}}', {})).toBe('{{constructor}} {{toString}}');
  });

  it('needs no variables argument at all', () => {
    expect(renderPrompt('plain body')).toBe('plain body');
  });
});

describe('extractVariables', () => {
  it('lists each distinct placeholder once, in first-seen order', () => {
    expect(extractVariables('{{b}} {{a}} {{b}} {{c}}')).toEqual(['b', 'a', 'c']);
  });

  it('finds nothing in a body with no placeholders', () => {
    expect(extractVariables('no placeholders here')).toEqual([]);
  });

  it('ignores a single brace pair', () => {
    expect(extractVariables('{name} and {{name}}')).toEqual(['name']);
  });
});

describe('missingRequiredVariables', () => {
  const variables = [
    variable({ name: 'navigation_map', required: true }),
    variable({ name: 'user_question', required: true }),
    variable({ name: 'tone', required: false }),
  ];

  it('names the required placeholders an edit dropped', () => {
    expect(missingRequiredVariables('Answer {{user_question}}.', variables)).toEqual(['navigation_map']);
  });

  it('is empty once every required placeholder is back', () => {
    expect(missingRequiredVariables('{{navigation_map}} {{user_question}}', variables)).toEqual([]);
  });

  it('does not care about the optional ones', () => {
    expect(missingRequiredVariables('{{navigation_map}} {{user_question}}', variables)).not.toContain('tone');
  });

  it('is empty for a prompt with no declared variables', () => {
    expect(missingRequiredVariables('anything', [])).toEqual([]);
  });
});

describe('braced', () => {
  it('writes a name the way it appears in a body', () => {
    expect(braced('navigation_map')).toBe('{{navigation_map}}');
  });
});

describe('exampleValues', () => {
  it('previews with the catalogue’s example', () => {
    expect(exampleValues([variable({ name: 'city', example: 'Pune' })])).toEqual({ city: 'Pune' });
  });

  it('falls back to the placeholder itself, which reads better than a gap', () => {
    expect(exampleValues([variable({ name: 'city' })])).toEqual({ city: '{{city}}' });
  });

  it('returns nothing for a prompt with no variables', () => {
    expect(exampleValues([])).toEqual({});
  });
});

describe('estimateTokens', () => {
  it('is zero for nothing at all', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('   \n ')).toBe(0);
    expect(estimateTokens(undefined as unknown as string)).toBe(0);
  });

  it('never reports zero for real content', () => {
    expect(estimateTokens('a')).toBeGreaterThanOrEqual(1);
  });

  it('averages the chars-per-token and words-per-token rules of thumb', () => {
    // 11 chars, 2 words -> ceil((11/4 + 2/0.75) / 2) = ceil(2.708…) = 3
    expect(estimateTokens('hello world')).toBe(3);
  });

  it('grows with the body', () => {
    expect(estimateTokens('word '.repeat(100))).toBeGreaterThan(estimateTokens('word '.repeat(10)));
  });

  it('ignores the whitespace around a body', () => {
    expect(estimateTokens('  hello world  ')).toBe(estimateTokens('hello world'));
  });
});
