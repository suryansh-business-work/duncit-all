import { describe, expect, it } from 'vitest';
import {
  SOMETHING_FOR_YOU_ROUTES,
  SOMETHING_FOR_YOU_TITLE_LINES,
  SOMETHING_FOR_YOU_TITLE_MAX,
  clampSomethingForYouTitle,
  resolveSomethingForYouTarget,
  type SomethingForYouItem,
} from '../src/something-for-you';

/** A rail card, with only the fields under test set deliberately. */
const card = (over: Partial<SomethingForYouItem> = {}): SomethingForYouItem => ({
  id: 'sfy-1',
  title: 'Refer and earn',
  image_url: 'https://cdn.example.com/referral.png',
  bottom_text: 'Invite a friend',
  action_type: 'NONE',
  link_path: '',
  link_url: '',
  sort_order: 0,
  is_active: true,
  ...over,
});

describe('SOMETHING_FOR_YOU_ROUTES', () => {
  it('offers only in-app destinations: every entry is an absolute path with a label', () => {
    expect(SOMETHING_FOR_YOU_ROUTES.length).toBeGreaterThan(0);
    for (const route of SOMETHING_FOR_YOU_ROUTES) {
      expect(route.path.startsWith('/')).toBe(true);
      expect(route.path).not.toMatch(/^https?:/);
      expect(route.label.trim().length).toBeGreaterThan(0);
    }
  });

  // The admin picks from a labelled menu; two entries for one screen, or one
  // label for two screens, would make that menu ambiguous.
  it('never lists the same destination or the same label twice', () => {
    const paths = SOMETHING_FOR_YOU_ROUTES.map((r) => r.path);
    const labels = SOMETHING_FOR_YOU_ROUTES.map((r) => r.label);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  // mWeb's router and the app's linking config match these paths verbatim, so
  // a trailing slash (or inner whitespace) would route nowhere.
  it('stores paths the way both routers match them — no trailing slash except Home', () => {
    for (const route of SOMETHING_FOR_YOU_ROUTES) {
      expect(route.path).not.toMatch(/\s/);
      if (route.path !== '/') expect(route.path.endsWith('/')).toBe(false);
    }
    expect(SOMETHING_FOR_YOU_ROUTES.some((r) => r.path === '/')).toBe(true);
  });
});

describe('title limits', () => {
  it('caps a headline at thirty characters over at most three lines', () => {
    expect(SOMETHING_FOR_YOU_TITLE_MAX).toBe(30);
    expect(SOMETHING_FOR_YOU_TITLE_LINES).toBe(3);
  });
});

describe('resolveSomethingForYouTarget', () => {
  it('sends a ROUTE card to its in-app path', () => {
    expect(resolveSomethingForYouTarget(card({ action_type: 'ROUTE', link_path: '/referral' }))).toEqual({
      kind: 'route',
      path: '/referral',
    });
  });

  it('sends a URL card out to its web address', () => {
    expect(
      resolveSomethingForYouTarget(card({ action_type: 'URL', link_url: 'https://duncit.com/blog' })),
    ).toEqual({ kind: 'url', url: 'https://duncit.com/blog' });
  });

  it('does nothing for a NONE card even when links are still stored on it', () => {
    expect(
      resolveSomethingForYouTarget(
        card({ action_type: 'NONE', link_path: '/referral', link_url: 'https://duncit.com' }),
      ),
    ).toEqual({ kind: 'none' });
  });

  // Two genuinely different actions, not one with a fallback: a ROUTE card with
  // no path must not quietly become a URL card because an address happens to
  // be stored, and vice versa.
  it('resolves to nothing, not a dead button, when a ROUTE card carries no path', () => {
    expect(
      resolveSomethingForYouTarget(
        card({ action_type: 'ROUTE', link_path: '', link_url: 'https://duncit.com' }),
      ),
    ).toEqual({ kind: 'none' });
  });

  it('resolves to nothing when a URL card carries no address', () => {
    expect(
      resolveSomethingForYouTarget(card({ action_type: 'URL', link_url: '', link_path: '/referral' })),
    ).toEqual({ kind: 'none' });
  });

  it('lets the action type decide when both a path and an address are stored', () => {
    const both = { link_path: '/referral', link_url: 'https://duncit.com/referral' };
    expect(resolveSomethingForYouTarget(card({ action_type: 'ROUTE', ...both }))).toEqual({
      kind: 'route',
      path: '/referral',
    });
    expect(resolveSomethingForYouTarget(card({ action_type: 'URL', ...both }))).toEqual({
      kind: 'url',
      url: 'https://duncit.com/referral',
    });
  });
});

describe('clampSomethingForYouTitle', () => {
  it('returns a headline that fits unchanged, with no ellipsis', () => {
    expect(clampSomethingForYouTitle('Refer and earn')).toBe('Refer and earn');
  });

  it('treats the limit as inclusive — exactly thirty characters still fit', () => {
    const thirty = 'Thirty characters of headline!';
    expect(thirty).toHaveLength(30);
    expect(clampSomethingForYouTitle(thirty)).toBe(thirty);
    // One more and it no longer fits; the cut lands on the word boundary.
    expect(clampSomethingForYouTitle(`${thirty}!`)).toBe('Thirty characters of…');
  });

  it('trims surrounding whitespace before measuring', () => {
    expect(clampSomethingForYouTitle('   Refer and earn   ')).toBe('Refer and earn');
    // Padding alone must not push a headline over the limit.
    expect(clampSomethingForYouTitle('  Thirty characters of headline!  ')).toBe(
      'Thirty characters of headline!',
    );
  });

  it('cuts on the last word boundary when one falls in the final third', () => {
    // "Invite Friends. Earn Rewards E…" would read as broken.
    expect(clampSomethingForYouTitle('Invite Friends. Earn Rewards Every Week')).toBe(
      'Invite Friends. Earn Rewards…',
    );
  });

  // A boundary earlier than two-thirds in would throw away more headline than
  // the ellipsis saves, so the cut goes mid-word instead.
  it('cuts mid-word when the nearest boundary is too far back', () => {
    expect(clampSomethingForYouTitle('Join Supercalifragilisticexpialidocious')).toBe(
      'Join Supercalifragilisticexpia…',
    );
    expect(clampSomethingForYouTitle('Supercalifragilisticexpialidocious pods')).toBe(
      'Supercalifragilisticexpialidoc…',
    );
  });

  // The threshold is 0.66 of the limit, not two-thirds: with max 30 that is
  // 19.8, so a space at index 20 (exactly two-thirds in) still counts and one
  // at 19 does not. A strict two-thirds rule would cut the first case mid-word.
  it('honours a word boundary from the 0.66 mark — index 20 of 30 counts, 19 does not', () => {
    expect(clampSomethingForYouTitle(`${'a'.repeat(20)} ${'b'.repeat(20)}`)).toBe(`${'a'.repeat(20)}…`);
    expect(clampSomethingForYouTitle(`${'a'.repeat(19)} ${'b'.repeat(20)}`)).toBe(
      `${'a'.repeat(19)} ${'b'.repeat(10)}…`,
    );
  });

  it('drops punctuation left dangling in front of the ellipsis', () => {
    expect(clampSomethingForYouTitle('Refer friends, earn coins, and win big')).toBe(
      'Refer friends, earn coins…',
    );
    // Walks back over every piece of debris, not just the last character.
    expect(clampSomethingForYouTitle('Weekend pods are back again - join now')).toBe(
      'Weekend pods are back again…',
    );
  });

  it('treats a line break or tab before the cut as debris too', () => {
    expect(clampSomethingForYouTitle('Refer-and-earn-coins-everyday\nJoin the club')).toBe(
      'Refer-and-earn-coins-everyday…',
    );
    expect(clampSomethingForYouTitle('Refer-and-earn-coins-everyday\tJoin the club')).toBe(
      'Refer-and-earn-coins-everyday…',
    );
  });

  it('leaves a lone ellipsis when everything before the cut is debris', () => {
    expect(clampSomethingForYouTitle('.'.repeat(40))).toBe('…');
  });

  it('honours a custom limit instead of the shared default', () => {
    expect(clampSomethingForYouTitle('Refer and earn coins', 10)).toBe('Refer and…');
    expect(clampSomethingForYouTitle('Refer', 10)).toBe('Refer');
  });
});
