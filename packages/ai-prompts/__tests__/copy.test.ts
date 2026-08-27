/**
 * The copy assembly and the two URL helpers.
 *
 * `promptCopy` is the rule-38 seam: every label the library renders is read
 * through the translator, so the whole screen follows Admin > Localization.
 * The URL helpers are what the operator pastes elsewhere — their shape is the
 * contract with whatever fetches the feed.
 */
import { describe, expect, it } from 'vitest';

import { apiOriginFromGraphqlUrl, promptCopy, promptFeedUrl } from '../src/copy';

describe('promptFeedUrl', () => {
  it('addresses the whole library when given nothing to narrow by', () => {
    expect(promptFeedUrl('https://server.duncit.com')).toBe(
      'https://server.duncit.com/ai-prompts/prompts.json',
    );
  });

  it('narrows the list by kind', () => {
    expect(promptFeedUrl('https://server.duncit.com', { kind: 'AI' })).toBe(
      'https://server.duncit.com/ai-prompts/prompts.json?kind=AI',
    );
  });

  it('addresses ONE prompt by key, URL-encoded — the key goes in a query string', () => {
    expect(promptFeedUrl('https://server.duncit.com', { key: 'ask-bot.navigation' })).toBe(
      'https://server.duncit.com/ai-prompts/prompt.json?key=ask-bot.navigation',
    );
    expect(promptFeedUrl('https://server.duncit.com', { key: 'a&b' })).toContain('key=a%26b');
  });

  it('tolerates a trailing slash on the origin instead of emitting a double one', () => {
    expect(promptFeedUrl('https://server.duncit.com/', { kind: 'CODE' })).toBe(
      'https://server.duncit.com/ai-prompts/prompts.json?kind=CODE',
    );
  });
});

describe('apiOriginFromGraphqlUrl', () => {
  it('strips the /graphql path the portal already talks to, slashed or not', () => {
    expect(apiOriginFromGraphqlUrl('https://server.duncit.com/graphql')).toBe('https://server.duncit.com');
    expect(apiOriginFromGraphqlUrl('https://server.duncit.com/graphql/')).toBe('https://server.duncit.com');
  });

  it('leaves a URL that is not a graphql endpoint alone', () => {
    expect(apiOriginFromGraphqlUrl('https://server.duncit.com')).toBe('https://server.duncit.com');
  });
});

describe('promptCopy', () => {
  it('reads EVERY label through the translator — no literal survives into the render', () => {
    const seen: string[] = [];
    const copy = promptCopy((key) => {
      seen.push(key);
      return `[${key}]`;
    });

    expect(copy.pageTitle).toBe('[ai.library.pageTitle]');
    expect(copy.kinds.CODE.label).toBe('[ai.library.kinds.CODE.label]');
    expect(copy.roles.USER).toBe('[ai.library.roles.USER]');
    expect(copy.fields.content).toBe('[ai.library.fields.content]');
    expect(copy.hints.keyCode).toBe('[ai.library.hints.keyCode]');
    expect(copy.cancel).toBe('[shell.common.cancel]');
    // Everything came from a key; nothing was written as a literal.
    expect(seen.length).toBeGreaterThan(40);
    expect(seen.every((key) => /^(ai\.library|shell\.common)\./.test(key))).toBe(true);
  });
});
