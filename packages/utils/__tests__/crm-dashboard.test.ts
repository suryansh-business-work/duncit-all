import { describe, expect, it } from 'vitest';
import {
  CRM_DASHBOARD_RANGES,
  crmAggregatePriorities,
  crmAggregateServices,
  crmAggregateStages,
  crmAggregateSuperCategories,
  crmAggregateTotals,
  crmIsInWindow,
  crmLeadsInWindow,
  crmRangeToWindow,
  crmServiceLabel,
  type CrmDashboardLead,
} from '../src';

/** The CRM dashboard's counts — the numbers the portal and the app both show. */

// Wednesday 2026-11-25, 15:30 local.
const NOW = new Date(2026, 10, 25, 15, 30);
const lead = (over: Partial<CrmDashboardLead> = {}): CrmDashboardLead => ({ lead_status: 'New', ...over });

describe('crmRangeToWindow', () => {
  it('offers the ranges in the picker’s order', () => {
    expect(CRM_DASHBOARD_RANGES).toEqual(['today', 'week', 'month', 'year', 'all', 'custom']);
  });

  it('starts today at midnight, the week on Monday, the month and year on their first day, all ending now', () => {
    expect(crmRangeToWindow('today', {}, NOW)).toEqual({ from: new Date(2026, 10, 25), to: NOW });
    expect(crmRangeToWindow('week', {}, NOW)).toEqual({ from: new Date(2026, 10, 23), to: NOW });
    expect(crmRangeToWindow('month', {}, NOW)).toEqual({ from: new Date(2026, 10, 1), to: NOW });
    expect(crmRangeToWindow('year', {}, NOW)).toEqual({ from: new Date(2026, 0, 1), to: NOW });
  });

  it('counts a Sunday in the week that began the Monday before', () => {
    const sunday = new Date(2026, 10, 29, 9, 0);
    expect(crmRangeToWindow('week', {}, sunday).from).toEqual(new Date(2026, 10, 23));
  });

  it('covers all time as an open window, and a custom range as whole days, either end optional', () => {
    expect(crmRangeToWindow('all', {}, NOW)).toEqual({});
    expect(crmRangeToWindow('custom', { from: new Date(2026, 10, 2, 14), to: new Date(2026, 10, 9, 8) }, NOW)).toEqual({
      from: new Date(2026, 10, 2),
      to: new Date(2026, 10, 9, 23, 59, 59, 999),
    });
    expect(crmRangeToWindow('custom', {}, NOW)).toEqual({ from: undefined, to: undefined });
  });

  it('uses the current time when none is given', () => {
    expect(crmRangeToWindow('today', {}).to).toBeInstanceOf(Date);
  });
});

describe('crmIsInWindow / crmLeadsInWindow', () => {
  const window = { from: new Date(2026, 10, 1), to: new Date(2026, 10, 30) };

  it('keeps a lead created inside the window and drops one before or after it', () => {
    expect(crmIsInWindow(new Date(2026, 10, 10).toISOString(), window)).toBe(true);
    expect(crmIsInWindow(new Date(2026, 9, 31).toISOString(), window)).toBe(false);
    expect(crmIsInWindow(new Date(2026, 11, 1).toISOString(), window)).toBe(false);
  });

  it('never counts a missing or unreadable date', () => {
    expect(crmIsInWindow(null, window)).toBe(false);
    expect(crmIsInWindow('not a date', window)).toBe(false);
    expect(crmIsInWindow(new Date(2026, 10, 10).toISOString(), {})).toBe(true);
  });

  it('filters only when the window is bounded', () => {
    const leads = [lead({ created_at: new Date(2026, 10, 10).toISOString() }), lead({ created_at: null })];
    expect(crmLeadsInWindow(leads, window)).toHaveLength(1);
    expect(crmLeadsInWindow(leads, {})).toHaveLength(2);
  });
});

describe('aggregations', () => {
  const venue = [
    lead({ lead_status: 'New', priority: 'High', super_category_id: 'c1', services_offered: [{ service: 'DJ' }, { service: 'Other', custom_name: ' Karaoke ' }] }),
    lead({ lead_status: 'Won', priority: 'Low', super_category_id: 'gone', super_category: { name: 'Archived' } }),
  ];
  const host = [
    lead({ lead_status: 'Contacted', priority: 'High', services_offered: [{ service: 'DJ' }, { service: '' }] }),
    lead({ lead_status: 'Converted', super_category_id: 'gone2' }),
  ];

  it('counts each stage across both kinds, venue and host apart', () => {
    expect(crmAggregateStages(['New', 'Won'], ['New', 'Contacted'], venue, host)).toEqual([
      { stage: 'New', venue: 1, host: 0, total: 1 },
      { stage: 'Won', venue: 1, host: 0, total: 1 },
      { stage: 'Contacted', venue: 0, host: 1, total: 1 },
    ]);
  });

  it('counts each priority across both kinds', () => {
    expect(crmAggregatePriorities(['High', 'Low', 'Medium'], venue, host)).toEqual([
      { label: 'High', count: 2 },
      { label: 'Low', count: 1 },
      { label: 'Medium', count: 0 },
    ]);
  });

  it('tallies services most frequent first, naming "Other" by its free text and skipping blanks', () => {
    expect(crmAggregateServices(venue, host)).toEqual({
      services: [
        { label: 'DJ', count: 2 },
        { label: 'Karaoke', count: 1 },
      ],
      serviceTotals: { uniqueServices: 2, totalServiceRows: 3, leadsWithServices: 2 },
    });
    expect(crmServiceLabel({ service: 'Other', custom_name: '  ' })).toBe('Other');
    expect(crmServiceLabel({ service: null })).toBe('');
  });

  it('names an unnamed "Other" service "Other", and lists services seen equally often by name', () => {
    const leads = [lead({ services_offered: [{ service: 'Yoga' }, { service: 'Other', custom_name: null }] })];
    expect(crmAggregateServices(leads, []).services).toEqual([
      { label: 'Other', count: 1 },
      { label: 'Yoga', count: 1 },
    ]);
  });

  it('breaks leads down by super category, most leads first and ties by name, unknown ones under the given label', () => {
    const counts = crmAggregateSuperCategories([{ id: 'c1', name: 'Sports' }, { id: 'c2', name: 'Arts' }], venue, host, 'Uncategorised');
    expect(counts).toEqual([
      { super_category_id: 'gone', label: 'Archived', venue: 1, host: 0, total: 1 },
      { super_category_id: 'c1', label: 'Sports', venue: 1, host: 0, total: 1 },
      { super_category_id: '__none__', label: 'Uncategorised', venue: 0, host: 1, total: 1 },
      { super_category_id: 'gone2', label: 'Uncategorised', venue: 0, host: 1, total: 1 },
      { super_category_id: 'c2', label: 'Arts', venue: 0, host: 0, total: 0 },
    ]);
  });

  it('hides empty categories once the catalogue is long', () => {
    const catalogue = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, name: `Cat ${i}` }));
    const counts = crmAggregateSuperCategories(catalogue, [lead({ super_category_id: 'c3' })], [], 'Uncategorised');
    expect(counts).toEqual([{ super_category_id: 'c3', label: 'Cat 3', venue: 1, host: 0, total: 1 }]);
  });

  it('gives the totals and conversion as the share in a won or converted stage', () => {
    expect(crmAggregateTotals(venue, host)).toEqual({ venue: 2, host: 2, total: 4, conversionRate: 50 });
    expect(crmAggregateTotals([], [])).toEqual({ venue: 0, host: 0, total: 0, conversionRate: 0 });
  });
});
