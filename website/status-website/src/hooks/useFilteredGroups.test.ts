import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredGroups } from './useFilteredGroups';
import type { FilterState } from '../components/StatusFilters';
import type { ServiceGroup, SummaryResponse } from '../types';

const groups: ServiceGroup[] = [
  {
    title: 'Consoles',
    items: [
      { key: 'admin', name: 'Admin', url: 'https://admin.test', description: 'Admin console' },
      { key: 'crm', name: 'CRM', url: 'https://crm.test', description: 'Sales tooling' },
    ],
  },
  {
    title: 'Platform',
    items: [{ key: 'api', name: 'API', url: 'https://api.test', description: 'Core API' }],
  },
];

const summary = {
  services: {
    admin: { state: 'operational' },
    crm: { state: 'degraded' },
  },
} as unknown as SummaryResponse;

const filters = (over: Partial<FilterState> = {}): FilterState => ({
  query: '',
  status: 'all',
  group: 'all',
  ...over,
});

const run = (g: ServiceGroup[] | null, s: SummaryResponse | null, f: FilterState) =>
  renderHook(() => useFilteredGroups(g, s, f)).result.current;

describe('useFilteredGroups', () => {
  it('returns nothing when the catalog is not loaded', () => {
    expect(run(null, summary, filters())).toEqual([]);
  });

  it('passes everything through with the default filters', () => {
    const out = run(groups, summary, filters());
    expect(out.map((group) => group.title)).toEqual(['Consoles', 'Platform']);
  });

  it('filters by a text query across name and description', () => {
    const out = run(groups, summary, filters({ query: '  Sales  ' }));
    expect(out).toHaveLength(1);
    expect(out[0].items.map((item) => item.key)).toEqual(['crm']);
  });

  it('filters by group title', () => {
    const out = run(groups, summary, filters({ group: 'Platform' }));
    expect(out.map((group) => group.title)).toEqual(['Platform']);
  });

  it('keeps only services with issues when status is "issues"', () => {
    const out = run(groups, summary, filters({ status: 'issues' }));
    expect(out).toHaveLength(1);
    expect(out[0].items.map((item) => item.key)).toEqual(['crm']);
  });

  it('keeps only operational services (defaulting unknown states to operational)', () => {
    const out = run(groups, summary, filters({ status: 'operational' }));
    // admin is operational; api has no summary entry -> treated as operational; crm is dropped.
    expect(out.flatMap((group) => group.items.map((item) => item.key))).toEqual(['admin', 'api']);
  });
});
