import { describe, expect, it } from 'vitest';
import { DEFAULT_QUICK_ACCESS } from '@duncit/utils';
import { makeQuickAccessSchema } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const issuesOf = (selection: unknown[], flags = {}) => {
  const result = makeQuickAccessSchema(t, flags).safeParse({ selection });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('makeQuickAccessSchema', () => {
  it('accepts the default six', () => {
    expect(issuesOf([...DEFAULT_QUICK_ACCESS])).toEqual([]);
  });

  it('refuses five, naming the size in the translated message on the selection', () => {
    expect(issuesOf(DEFAULT_QUICK_ACCESS.slice(0, 5))).toEqual(['selection:mweb.sidebar.editorInvalid:{"max":6}']);
  });

  it('refuses seven, a duplicate and an unknown destination', () => {
    expect(issuesOf([...DEFAULT_QUICK_ACCESS, 'saved'])).toHaveLength(1);
    expect(issuesOf(['chats', 'chats', 'saved', 'gigs', 'faqs', 'badges'])).toHaveLength(1);
    expect(issuesOf(['chats', 'nope', 'saved', 'gigs', 'faqs', 'badges'])).toHaveLength(1);
  });

  it('refuses a gated destination until its flag is on', () => {
    const withCart = ['chats', 'cart', 'saved', 'gigs', 'faqs', 'badges'];
    expect(issuesOf(withCart)).toHaveLength(1);
    expect(issuesOf(withCart, { products: true })).toEqual([]);
  });
});
