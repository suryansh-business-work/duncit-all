import { describe, expect, it } from 'vitest';
import { DEFAULT_QUICK_ACCESS } from '@duncit/utils';
import { quickAccessSchema } from './quick-access.form';

const MESSAGE = 'Pick exactly 6 shortcuts to save.';

const issuesOf = (selection: unknown[], flags = {}) => {
  const result = quickAccessSchema(flags, MESSAGE).safeParse({ selection });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('quickAccessSchema', () => {
  it('accepts the default six', () => {
    expect(issuesOf([...DEFAULT_QUICK_ACCESS])).toEqual([]);
  });

  it('refuses five, with the translated message on the selection', () => {
    expect(issuesOf(DEFAULT_QUICK_ACCESS.slice(0, 5))).toEqual([`selection: ${MESSAGE}`]);
  });

  it('refuses a duplicate and an unknown destination', () => {
    expect(issuesOf(['chats', 'chats', 'saved', 'gigs', 'faqs', 'badges'])).toHaveLength(1);
    expect(issuesOf(['chats', 'nope', 'saved', 'gigs', 'faqs', 'badges'])).toHaveLength(1);
  });

  it('refuses a gated destination until its flag is on', () => {
    const withCart = ['chats', 'cart', 'saved', 'gigs', 'faqs', 'badges'];
    expect(issuesOf(withCart)).toHaveLength(1);
    expect(issuesOf(withCart, { products: true })).toEqual([]);
  });
});
