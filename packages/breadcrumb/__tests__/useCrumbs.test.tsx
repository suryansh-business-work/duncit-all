import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCrumbs } from '../src/useCrumbs';
import type { BreadcrumbNavItem, Crumb } from '../src/types';

const nav: BreadcrumbNavItem[] = [
  { label: 'App', to: '/', children: [{ label: 'Home Sub', to: '/home-sub' }] },
  { label: 'Venues', to: '/venues', children: [{ label: 'Detail', to: '/venues/detail' }] },
];

const labelMap = { billing: 'Billing & Invoices' };

const run = (
  path: string,
  override?: Crumb[] | null,
): Crumb[] => {
  const { result } = renderHook(() => useCrumbs({ nav, appName: 'App', labelMap, override }), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  });
  return result.current;
};

const labels = (crumbs: Crumb[]) => crumbs.map((c) => c.label);

describe('useCrumbs', () => {
  it('returns just the app home crumb (no link) at "/"', () => {
    const crumbs = run('/');
    expect(labels(crumbs)).toEqual(['App']);
    expect(crumbs[0].to).toBeUndefined();
  });

  it('returns just the app crumb at "/login"', () => {
    expect(labels(run('/login'))).toEqual(['App']);
  });

  it('renders a matched nav trail with the leaf as plain text', () => {
    const crumbs = run('/venues');
    expect(labels(crumbs)).toEqual(['App', 'Venues']);
    expect(crumbs[0].to).toBe('/');
    expect(crumbs[crumbs.length - 1].to).toBeUndefined();
  });

  it('renders the full parent→leaf nav trail for a deep match', () => {
    expect(labels(run('/venues/detail'))).toEqual(['App', 'Venues', 'Detail']);
  });

  it('skips a trail head whose label already equals the app name', () => {
    // Matching /home-sub yields trail [App, Home Sub]; the App head is skipped.
    expect(labels(run('/home-sub'))).toEqual(['App', 'Home Sub']);
  });

  it('appends humanised path segments trailing a matched nav item', () => {
    expect(labels(run('/venues/detail/annual-report'))).toEqual([
      'App',
      'Venues',
      'Detail',
      'Annual Report',
    ]);
  });

  it('collapses an opaque id tail to "Detail" and honors the labelMap', () => {
    expect(labels(run('/venues/detail/507f1f77bcf86cd799439011'))).toEqual([
      'App',
      'Venues',
      'Detail',
      'Detail',
    ]);
    expect(labels(run('/venues/detail/billing'))).toEqual([
      'App',
      'Venues',
      'Detail',
      'Billing & Invoices',
    ]);
  });

  it('uses the page override for the tail of a matched route', () => {
    const crumbs = run('/venues/detail/abc', [{ label: 'Acme Venue', to: '/x' }, { label: 'Members' }]);
    expect(labels(crumbs)).toEqual(['App', 'Venues', 'Detail', 'Acme Venue', 'Members']);
  });

  it('ignores an empty override array and falls back to segments', () => {
    expect(labels(run('/venues/detail/foo', []))).toEqual(['App', 'Venues', 'Detail', 'Foo']);
  });

  it('falls back to humanised segments when no nav item matches', () => {
    const crumbs = run('/random/thing');
    expect(labels(crumbs)).toEqual(['App', 'Random', 'Thing']);
    expect(crumbs[1].to).toBe('/random');
    expect(crumbs[2].to).toBeUndefined();
  });

  it('uses the override for the whole tail when no nav item matches', () => {
    const crumbs = run('/random/thing', [{ label: 'Custom', to: '/c' }, { label: 'End' }]);
    expect(labels(crumbs)).toEqual(['App', 'Custom', 'End']);
  });
});
