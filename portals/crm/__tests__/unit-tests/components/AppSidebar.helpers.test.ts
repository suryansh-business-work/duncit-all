import { describe, expect, it } from 'vitest';
import { bestChild, groupActive, matches } from '@/components/AppSidebar.helpers';
import type { AppNavItem } from '@/config/app-config';

describe('matches', () => {
  it('returns false for an undefined `to`', () => {
    expect(matches('/x', undefined)).toBe(false);
  });

  it('only matches "/" against the exact root pathname', () => {
    expect(matches('/', '/')).toBe(true);
    expect(matches('/anything', '/')).toBe(false);
  });

  it('matches exact paths', () => {
    expect(matches('/venue-leads', '/venue-leads')).toBe(true);
  });

  it('matches descendant paths via prefix', () => {
    expect(matches('/venue-leads/123', '/venue-leads')).toBe(true);
    expect(matches('/venue-leads/services', '/venue-leads')).toBe(true);
  });

  it('does not match unrelated paths that happen to share a prefix string', () => {
    expect(matches('/venue-leadsX', '/venue-leads')).toBe(false);
  });
});

describe('groupActive', () => {
  const venueLeads: AppNavItem = {
    label: 'Venue Leads',
    icon: 'location',
    children: [
      { label: 'All', to: '/venue-leads', icon: 'location' },
      { label: 'Services', to: '/venue-leads/services', icon: 'analytics' },
    ],
  };

  it('returns true when any child matches the pathname', () => {
    expect(groupActive('/venue-leads', venueLeads)).toBe(true);
    expect(groupActive('/venue-leads/services', venueLeads)).toBe(true);
    expect(groupActive('/venue-leads/123', venueLeads)).toBe(true);
  });

  it('returns false when no descendant matches', () => {
    expect(groupActive('/host-leads', venueLeads)).toBe(false);
    expect(groupActive('/', venueLeads)).toBe(false);
  });

  it('walks nested grandchildren too', () => {
    const nested: AppNavItem = {
      label: 'Top',
      icon: 'dashboard',
      children: [
        {
          label: 'Mid',
          icon: 'analytics',
          children: [{ label: 'Leaf', to: '/deep/nested/page', icon: 'analytics' }],
        },
      ],
    };
    expect(groupActive('/deep/nested/page', nested)).toBe(true);
  });
});

describe('bestChild', () => {
  const children: AppNavItem[] = [
    { label: 'All Host Leads', to: '/host-leads', icon: 'groups' },
    { label: 'Manage Host Services', to: '/host-leads/services', icon: 'analytics' },
  ];

  it('picks the longest-prefix matching child', () => {
    expect(bestChild('/host-leads/services', children)?.label).toBe('Manage Host Services');
  });

  it('falls back to the shorter sibling on a plain match', () => {
    expect(bestChild('/host-leads', children)?.label).toBe('All Host Leads');
  });

  it('returns null when nothing matches', () => {
    expect(bestChild('/dashboard', children)).toBeNull();
  });

  it('returns null when no child has a `to`', () => {
    expect(bestChild('/x', [{ label: 'Header', icon: 'dashboard' }])).toBeNull();
  });
});
