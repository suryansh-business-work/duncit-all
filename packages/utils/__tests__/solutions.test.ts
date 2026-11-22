import { describe, expect, it } from 'vitest';
import {
  SOLUTION_AUDIENCES,
  VENUE_KIT_FALLBACK_PATH,
  VENUE_KIT_SOLUTION_SLUG,
  venueKitFallbackSolution,
  groupSolutions,
  isListableSolution,
  solutionPath,
  type SolutionItem,
} from '../src/solutions';

const item = (over: Partial<SolutionItem> = {}): SolutionItem => ({
  title: 'Offering',
  slug: 'offering',
  summary: '',
  body: '',
  category: 'Cafe & Restaurant Automation',
  category_slug: 'cafe-restaurant-automation',
  image_url: '',
  cta_label: '',
  cta_url: '',
  audience: 'VENUE',
  coming_soon: false,
  sort_order: 0,
  ...over,
});

describe('solutionPath', () => {
  it('files an offering under its category', () => {
    expect(solutionPath({ category_slug: 'cafe-restaurant-automation', slug: 'venue-kit' })).toBe(
      '/solutions/cafe-restaurant-automation/venue-kit'
    );
  });

  it('gives the fallback Venue Kit the address the brief asked for', () => {
    expect(VENUE_KIT_FALLBACK_PATH).toBe('/solutions/cafe-restaurant-automation/venue-kit');
  });
});

describe('venueKitFallbackSolution', () => {
  const copy = { title: 'T', summary: 'S', category: 'C', cta_label: 'L' };

  it('is the Venue Kit as the server seeds it, worded by the caller', () => {
    const item = venueKitFallbackSolution(copy);
    expect(item).toMatchObject({ ...copy, slug: VENUE_KIT_SOLUTION_SLUG, audience: 'VENUE', coming_soon: true, cta_url: '' });
    expect(solutionPath(item)).toBe(VENUE_KIT_FALLBACK_PATH);
    expect(isListableSolution(item)).toBe(true);
    expect(item.image_url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});

describe('isListableSolution', () => {
  it('needs a known audience and both URL segments', () => {
    expect(isListableSolution(item())).toBe(true);
    expect(isListableSolution(item({ audience: null }))).toBe(false);
    expect(isListableSolution(item({ audience: 'GUEST' as never }))).toBe(false);
    expect(isListableSolution(item({ slug: '' }))).toBe(false);
    expect(isListableSolution(item({ category_slug: '' }))).toBe(false);
  });
});

describe('groupSolutions', () => {
  it('returns every audience in order, an empty one with no categories', () => {
    const groups = groupSolutions([]);
    expect(groups.map((g) => g.audience)).toEqual([...SOLUTION_AUDIENCES]);
    expect(groups.map((g) => g.key)).toEqual(['venue', 'host', 'clubAdmin', 'creator', 'community']);
    expect(groups.every((g) => g.categories.length === 0)).toBe(true);
  });

  it('groups each audience by category in first-seen order, keeping the given order inside a category', () => {
    const groups = groupSolutions([
      item({ slug: 'venue-kit' }),
      item({ slug: 'host-pass', audience: 'HOST', category: 'Hosting', category_slug: 'hosting' }),
      item({ slug: 'menu-qr', category: 'Cafe & Restaurant Automation' }),
      item({ slug: 'events-desk', category: 'Events', category_slug: 'events' }),
    ]);
    const venue = groups.find((g) => g.audience === 'VENUE');
    expect(venue?.categories.map((c) => [c.slug, c.items.map((i) => i.slug)])).toEqual([
      ['cafe-restaurant-automation', ['venue-kit', 'menu-qr']],
      ['events', ['events-desk']],
    ]);
    expect(venue?.categories[0].name).toBe('Cafe & Restaurant Automation');
    expect(groups.find((g) => g.audience === 'HOST')?.categories.map((c) => c.slug)).toEqual(['hosting']);
    expect(groups.find((g) => g.audience === 'CREATOR')?.categories).toEqual([]);
  });

  it('leaves out entries that cannot be addressed', () => {
    const groups = groupSolutions([item({ audience: null }), item({ category_slug: '' })]);
    expect(groups.every((g) => g.categories.length === 0)).toBe(true);
  });
});
