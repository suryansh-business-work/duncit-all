import { describe, it, expect } from 'vitest';
import { findBestNavMatch } from '../src/findBestNavMatch';
import type { BreadcrumbNavItem } from '../src/types';

const nav: BreadcrumbNavItem[] = [
  { label: 'Home', to: '/' },
  {
    label: 'Calculators',
    to: '/calc',
    children: [{ label: 'Pod Profit', to: '/calc/pod-profit' }],
  },
  {
    label: 'Group',
    children: [{ label: 'Reports', to: '/reports' }],
  },
];

describe('findBestNavMatch', () => {
  it('returns the deepest matching item with its full parent→leaf trail', () => {
    const match = findBestNavMatch('/calc/pod-profit', nav);
    expect(match?.to).toBe('/calc/pod-profit');
    expect(match?.trail.map((t) => t.label)).toEqual(['Calculators', 'Pod Profit']);
  });

  it('matches a parent item exactly', () => {
    expect(findBestNavMatch('/calc', nav)?.to).toBe('/calc');
  });

  it('matches the root only for an exact "/" pathname', () => {
    expect(findBestNavMatch('/', nav)?.to).toBe('/');
  });

  it('descends into group headers that have no `to` of their own', () => {
    const match = findBestNavMatch('/reports', nav);
    expect(match?.to).toBe('/reports');
    expect(match?.trail.map((t) => t.label)).toEqual(['Group', 'Reports']);
  });

  it('matches a nested sub-route via the startsWith rule', () => {
    expect(findBestNavMatch('/calc/pod-profit/extra', nav)?.to).toBe('/calc/pod-profit');
  });

  it('returns undefined when nothing matches', () => {
    expect(findBestNavMatch('/nope', nav)).toBeUndefined();
  });

  it('keeps the longer existing best when a shorter sibling also matches', () => {
    const oddNav: BreadcrumbNavItem[] = [
      { label: 'A', to: '/a/b', children: [{ label: 'C', to: '/a' }] },
    ];
    const match = findBestNavMatch('/a/b', oddNav);
    expect(match?.to).toBe('/a/b');
  });
});
