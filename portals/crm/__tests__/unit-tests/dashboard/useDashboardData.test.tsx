import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useDashboardData } from '@/pages/dashboard/useDashboardData';
import type { DateWindow } from '@/pages/dashboard/dashboardConfig';
import { CRM_LEAD_CONFIG, HOST_LEADS, SUPER_CATEGORIES, VENUE_LEADS } from '@/api/crm.gql';
import type { HostLead, VenueLead } from '@/api/crm.types';
import { hostLead, venueLead } from '../fixtures/leads';

const ALL_TIME: DateWindow = {};

const emptyLists = {
  venue_types: [], space_types: [], venue_event_suitability: [], week_days: [], booking_notices: [],
  pricing_models: [], amenities: [], lead_sources: [], host_types: [], host_interests: [], audience_sizes: [],
  frequencies: [], revenue_models: [], host_intent_scores: [], services_offered_options: [],
  venue_services_offered_options: [], host_services_offered_options: [],
};

const configMock = (statuses: {
  venue_lead_statuses: string[] | null;
  host_lead_statuses: string[] | null;
  priorities: string[] | null;
}): MockedResponse => ({
  request: { query: CRM_LEAD_CONFIG },
  result: { data: { crmLeadConfig: { ...emptyLists, ...statuses } } },
});

const superCategoriesMock: MockedResponse = {
  request: { query: SUPER_CATEGORIES },
  result: { data: { categories: [] } },
};

const venueMock = (leads: VenueLead[]): MockedResponse => ({
  request: { query: VENUE_LEADS, variables: { filter: {} } },
  result: { data: { venueLeads: leads } },
});

const hostMock = (leads: HostLead[]): MockedResponse => ({
  request: { query: HOST_LEADS, variables: { filter: {} } },
  result: { data: { hostLeads: leads } },
});

const wrapperFor = (list: MockedResponse[]) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={list}>
        {children}
      </MockedProvider>
    );
  };

describe('useDashboardData', () => {
  it('builds the stage and priority breakdowns from the server-configured lists', async () => {
    const { result } = renderHook(() => useDashboardData(ALL_TIME), {
      wrapper: wrapperFor([
        configMock({ venue_lead_statuses: ['New', 'Won'], host_lead_statuses: ['New'], priorities: ['High', 'Low'] }),
        superCategoriesMock,
        venueMock([venueLead({ id: 'v1', lead_status: 'New', priority: 'High' })]),
        hostMock([hostLead({ id: 'h1', lead_status: 'Won', priority: 'Low' })]),
      ]),
    });

    await waitFor(() => expect(result.current.stageCounts).toHaveLength(2));
    expect(result.current.stageCounts).toEqual([
      { stage: 'New', venue: 1, host: 0, total: 1 },
      { stage: 'Won', venue: 0, host: 1, total: 1 },
    ]);
    expect(result.current.priorities).toEqual([
      { label: 'High', count: 1 },
      { label: 'Low', count: 1 },
    ]);
  });

  it('falls back to empty breakdowns when the server leaves the status and priority lists null', async () => {
    const { result } = renderHook(() => useDashboardData(ALL_TIME), {
      wrapper: wrapperFor([
        configMock({ venue_lead_statuses: null, host_lead_statuses: null, priorities: null }),
        superCategoriesMock,
        venueMock([venueLead({ id: 'v1' })]),
        hostMock([]),
      ]),
    });

    await waitFor(() => expect(result.current.venueLeads).toHaveLength(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stageCounts).toEqual([]);
    expect(result.current.priorities).toEqual([]);
    expect(result.current.totals.venue).toBe(1);
  });

  it('keeps only the leads created inside the selected date window', async () => {
    const window: DateWindow = { from: new Date('2026-09-10T00:00:00.000Z'), to: new Date('2026-09-30T00:00:00.000Z') };
    const { result } = renderHook(() => useDashboardData(window), {
      wrapper: wrapperFor([
        configMock({ venue_lead_statuses: [], host_lead_statuses: [], priorities: [] }),
        superCategoriesMock,
        venueMock([
          venueLead({ id: 'v-old', created_at: '2026-09-01T10:00:00.000Z' }),
          venueLead({ id: 'v-in', created_at: '2026-09-15T10:00:00.000Z' }),
        ]),
        hostMock([
          hostLead({ id: 'h-in', created_at: '2026-09-20T10:00:00.000Z' }),
          hostLead({ id: 'h-late', created_at: '2026-10-02T10:00:00.000Z' }),
        ]),
      ]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.venueLeads.map((l) => l.id)).toEqual(['v-in']));
    expect(result.current.hostLeads.map((l) => l.id)).toEqual(['h-in']);
    expect(result.current.totals.total).toBe(2);
  });

  it('refetch reloads both lead lists from the server', async () => {
    const { result } = renderHook(() => useDashboardData(ALL_TIME), {
      wrapper: wrapperFor([
        configMock({ venue_lead_statuses: [], host_lead_statuses: [], priorities: [] }),
        superCategoriesMock,
        venueMock([venueLead({ id: 'v1' })]),
        hostMock([]),
        venueMock([venueLead({ id: 'v1' }), venueLead({ id: 'v2', venue_name: 'Lake Lawn' })]),
        hostMock([hostLead({ id: 'h1' })]),
      ]),
    });

    await waitFor(() => expect(result.current.venueLeads).toHaveLength(1));
    expect(result.current.hostLeads).toEqual([]);

    let settled: unknown = 'pending';
    await act(async () => {
      settled = await result.current.refetch();
    });

    expect(settled).toBeUndefined();
    await waitFor(() => expect(result.current.venueLeads.map((l) => l.id)).toEqual(['v1', 'v2']));
    expect(result.current.hostLeads.map((l) => l.id)).toEqual(['h1']);
    expect(result.current.totals.total).toBe(3);
  });
});
