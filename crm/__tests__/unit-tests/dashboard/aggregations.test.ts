import { describe, expect, it } from 'vitest';
import {
  aggregatePriorities,
  aggregateServices,
  aggregateStages,
  aggregateSuperCategories,
  aggregateTotals,
  serviceLabel,
} from '@/pages/dashboard/dashboardAggregations';
import type { HostLead, SuperCategoryOption, VenueLead } from '@/api/crm.types';

const baseVenue = (over: Partial<VenueLead>): VenueLead => ({
  id: 'v',
  venue_name: '',
  venue_types: [],
  city: '',
  full_address: '',
  contacts: [],
  event_suitability: [],
  available_days: [],
  pricing_models: [],
  gst_applicable: false,
  invoice_available: false,
  amenities: [],
  photos: [],
  videos: [],
  services_offered: [],
  linked_host_ids: [],
  linked_hosts: [],
  lead_status: 'New',
  priority: 'Medium',
  activity_log: [],
  ...over,
});

const baseHost = (over: Partial<HostLead>): HostLead => ({
  id: 'h',
  host_name: '',
  contacts: [],
  interests: [],
  revenue_models: [],
  need_venue: false,
  need_vendor: false,
  previous_events_hosted: false,
  host_intent_scores: [],
  services_offered: [],
  lead_status: 'New',
  priority: 'Medium',
  activity_log: [],
  ...over,
});

describe('serviceLabel', () => {
  it('returns the catalogue value for normal services', () => {
    expect(serviceLabel({ service: 'Catering', custom_name: '', description: '' })).toBe('Catering');
  });

  it('uses custom_name for "Other"', () => {
    expect(
      serviceLabel({ service: 'Other', custom_name: 'Photographer', description: '' })
    ).toBe('Photographer');
  });

  it('falls back to "Other" when custom_name is blank', () => {
    expect(serviceLabel({ service: 'Other', custom_name: '', description: '' })).toBe('Other');
  });
});

describe('aggregateStages', () => {
  it('builds the union of venue + host stages with split counts', () => {
    const venueLeads = [baseVenue({ lead_status: 'New' }), baseVenue({ lead_status: 'Won' })];
    const hostLeads = [baseHost({ lead_status: 'New' }), baseHost({ lead_status: 'Qualified' })];
    const result = aggregateStages(
      ['New', 'Won'],
      ['New', 'Qualified'],
      venueLeads,
      hostLeads
    );
    expect(result).toEqual([
      { stage: 'New', venue: 1, host: 1, total: 2 },
      { stage: 'Won', venue: 1, host: 0, total: 1 },
      { stage: 'Qualified', venue: 0, host: 1, total: 1 },
    ]);
  });
});

describe('aggregatePriorities', () => {
  it('sums venue + host counts per priority', () => {
    const venueLeads = [baseVenue({ priority: 'High' }), baseVenue({ priority: 'Medium' })];
    const hostLeads = [baseHost({ priority: 'High' })];
    expect(aggregatePriorities(['High', 'Medium', 'Low'], venueLeads, hostLeads)).toEqual([
      { label: 'High', count: 2 },
      { label: 'Medium', count: 1 },
      { label: 'Low', count: 0 },
    ]);
  });
});

describe('aggregateServices', () => {
  it('counts mentions across both lead kinds and sorts by frequency', () => {
    const venueLeads = [
      baseVenue({ services_offered: [{ service: 'Catering', custom_name: '', description: '' }] }),
      baseVenue({
        services_offered: [
          { service: 'Catering', custom_name: '', description: '' },
          { service: 'Other', custom_name: 'Photographer', description: '' },
        ],
      }),
    ];
    const hostLeads = [
      baseHost({ services_offered: [{ service: 'Other', custom_name: 'Photographer', description: '' }] }),
    ];
    const { services, serviceTotals } = aggregateServices(venueLeads, hostLeads);
    expect(services).toEqual([
      { label: 'Catering', count: 2 },
      { label: 'Photographer', count: 2 },
    ]);
    expect(serviceTotals).toEqual({
      uniqueServices: 2,
      totalServiceRows: 4,
      leadsWithServices: 3,
    });
  });

  it('returns zero totals when nothing is tagged', () => {
    const { services, serviceTotals } = aggregateServices([baseVenue({})], [baseHost({})]);
    expect(services).toEqual([]);
    expect(serviceTotals.uniqueServices).toBe(0);
    expect(serviceTotals.leadsWithServices).toBe(0);
  });

  it('ignores blank service rows', () => {
    const venueLeads = [
      baseVenue({ services_offered: [{ service: '', custom_name: '', description: '' }] }),
    ];
    const { services, serviceTotals } = aggregateServices(venueLeads, []);
    expect(services).toEqual([]);
    expect(serviceTotals.totalServiceRows).toBe(0);
  });
});

describe('aggregateSuperCategories', () => {
  const cats: SuperCategoryOption[] = [
    { id: 'cat-sports', name: 'Sports', slug: 'sports' },
    { id: 'cat-music', name: 'Music', slug: 'music' },
  ];

  it('pre-populates from the catalogue and tallies leads per id', () => {
    const venueLeads = [
      baseVenue({ super_category_id: 'cat-sports', super_category: { id: 'cat-sports', name: 'Sports', slug: 'sports' } }),
      baseVenue({ super_category_id: 'cat-music' }),
    ];
    const hostLeads = [baseHost({ super_category_id: 'cat-sports' })];
    const result = aggregateSuperCategories(cats, venueLeads, hostLeads);
    expect(result[0]).toMatchObject({ label: 'Sports', venue: 1, host: 1, total: 2 });
    expect(result[1]).toMatchObject({ label: 'Music', venue: 1, host: 0, total: 1 });
  });

  it('routes orphan ids into an Uncategorised bucket', () => {
    const venueLeads = [baseVenue({ super_category_id: null })];
    const hostLeads = [baseHost({ super_category_id: undefined })];
    const result = aggregateSuperCategories(cats, venueLeads, hostLeads);
    const uncat = result.find((b) => b.super_category_id === '__none__');
    expect(uncat).toMatchObject({ label: 'Uncategorised', venue: 1, host: 1, total: 2 });
  });

  it('hides zero buckets when the catalogue is large', () => {
    const big: SuperCategoryOption[] = Array.from({ length: 10 }, (_, i) => ({
      id: `cat-${i}`,
      name: `C${i}`,
      slug: `c${i}`,
    }));
    const venueLeads = [baseVenue({ super_category_id: 'cat-0' })];
    const result = aggregateSuperCategories(big, venueLeads, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ super_category_id: 'cat-0', total: 1 });
  });
});

describe('aggregateTotals', () => {
  it('reports counts and conversion percentage', () => {
    const venueLeads = [
      baseVenue({ lead_status: 'Won' }),
      baseVenue({ lead_status: 'New' }),
    ];
    const hostLeads = [
      baseHost({ lead_status: 'Closed-Won' }),
      baseHost({ lead_status: 'Negotiation' }),
    ];
    const totals = aggregateTotals(venueLeads, hostLeads);
    expect(totals).toEqual({ venue: 2, host: 2, total: 4, conversionRate: 50 });
  });

  it('returns zero conversion when there are no leads', () => {
    expect(aggregateTotals([], [])).toEqual({ venue: 0, host: 0, total: 0, conversionRate: 0 });
  });
});
