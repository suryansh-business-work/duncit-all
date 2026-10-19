import { describe, expect, it } from 'vitest';
import { makeQuickAccessSchema } from '@duncit/forms/schemas';
import { DEFAULT_QUICK_ACCESS } from '@duncit/utils';
import { fallbackT } from '../../../../i18n/fallback';

// The editor validates with the shared schema, bound to mWeb's own translator:
// this pins the words a member actually sees when the pick is not six.
const issuesOf = (selection: unknown[], flags = {}) => {
  const result = makeQuickAccessSchema(fallbackT, flags).safeParse({ selection });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('Quick Access editor validation (mWeb)', () => {
  it('accepts the default six', () => {
    expect(issuesOf([...DEFAULT_QUICK_ACCESS])).toEqual([]);
  });

  it('refuses five with the translated message, naming the size, on the selection', () => {
    const [issue] = issuesOf(DEFAULT_QUICK_ACCESS.slice(0, 5));
    expect(issue).toMatch(/^selection: .*6/);
    expect(issue).not.toContain('mweb.sidebar.editorInvalid');
  });

  it('refuses a gated destination until its flag is on', () => {
    const withCart = ['chats', 'cart', 'saved', 'gigs', 'faqs', 'badges'];
    expect(issuesOf(withCart)).toHaveLength(1);
    expect(issuesOf(withCart, { products: true })).toEqual([]);
  });
});
