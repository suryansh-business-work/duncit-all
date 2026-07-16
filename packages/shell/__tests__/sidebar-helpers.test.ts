import { describe, it, expect } from 'vitest';
import type { AppNavItem } from '../src/types';
import { matches, groupActive, bestChild, filterNav } from '../src/chrome/AppSidebar/helpers';

describe('matches', () => {
  it('returns false without a target', () => {
    expect(matches('/x')).toBe(false);
  });

  it('handles the root path exactly', () => {
    expect(matches('/', '/')).toBe(true);
    expect(matches('/x', '/')).toBe(false);
  });

  it('matches exact and prefix segments', () => {
    expect(matches('/host-leads', '/host-leads')).toBe(true);
    expect(matches('/host-leads/services', '/host-leads')).toBe(true);
    expect(matches('/host-leadsx', '/host-leads')).toBe(false);
  });
});

describe('groupActive', () => {
  it('is true when a direct child matches', () => {
    const item: AppNavItem = { label: 'G', children: [{ label: 'C', to: '/c' }] };
    expect(groupActive('/c', item)).toBe(true);
  });

  it('recurses into nested groups', () => {
    const item: AppNavItem = {
      label: 'G',
      children: [{ label: 'Sub', children: [{ label: 'Deep', to: '/deep' }] }],
    };
    expect(groupActive('/deep', item)).toBe(true);
  });

  it('is false with no matching descendant or no children', () => {
    expect(groupActive('/x', { label: 'G', children: [{ label: 'C', to: '/c' }] })).toBe(false);
    expect(groupActive('/x', { label: 'Leaf', to: '/leaf' })).toBe(false);
  });
});

describe('bestChild', () => {
  const children: AppNavItem[] = [
    { label: 'noTo' },
    { label: 'A', to: '/host-leads' },
    { label: 'B', to: '/host-leads/services' },
    { label: 'C', to: '/other' },
  ];

  it('returns the longest matching prefix', () => {
    expect(bestChild('/host-leads/services', children)?.label).toBe('B');
  });

  it('returns null when nothing matches', () => {
    expect(bestChild('/nope', children)).toBeNull();
  });
});

describe('filterNav', () => {
  const nav: AppNavItem[] = [
    { label: 'Dashboard', to: '/' },
    { label: 'Sales', children: [{ label: 'Leads', to: '/leads' }, { label: 'Deals', to: '/deals' }] },
  ];

  it('returns items unchanged for an empty query', () => {
    expect(filterNav(nav, '')).toBe(nav);
  });

  it('keeps the whole subtree when the group label matches', () => {
    const out = filterNav(nav, 'sales');
    expect(out).toHaveLength(1);
    expect(out[0].children).toHaveLength(2);
  });

  it('keeps only matching descendants', () => {
    const out = filterNav(nav, 'leads');
    expect(out).toHaveLength(1);
    expect(out[0].children).toEqual([{ label: 'Leads', to: '/leads' }]);
  });

  it('drops non-matching items', () => {
    expect(filterNav(nav, 'zzz')).toEqual([]);
  });
});
