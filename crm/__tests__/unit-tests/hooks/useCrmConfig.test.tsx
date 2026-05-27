import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useCrmConfig } from '@/api/useCrmConfig';
import { useSuperCategories } from '@/api/useSuperCategories';
import { CRM_LEAD_CONFIG, SUPER_CATEGORIES } from '@/api/crm.gql';

const wrapper = (mocks: any[]) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={mocks} addTypename={false}>{children}</MockedProvider>;
  };

describe('useCrmConfig', () => {
  it('returns the empty config while the query is loading', () => {
    const { result } = renderHook(() => useCrmConfig(), { wrapper: wrapper([]) });
    expect(result.current.loading).toBe(true);
    expect(result.current.config.venue_types).toEqual([]);
  });

  it('returns the server config once resolved', async () => {
    const mocks = [
      {
        request: { query: CRM_LEAD_CONFIG },
        result: {
          data: {
            crmLeadConfig: {
              venue_types: ['Banquet Hall'],
              space_types: ['Indoor'],
              venue_event_suitability: ['Wedding'],
              week_days: ['Monday'],
              booking_notices: ['Instant'],
              pricing_models: ['Hourly'],
              amenities: ['Parking'],
              lead_sources: ['Referral'],
              venue_lead_statuses: ['New'],
              host_lead_statuses: ['New'],
              priorities: ['Medium'],
              host_types: ['Individual'],
              host_interests: ['Sports'],
              audience_sizes: ['10-20'],
              frequencies: ['One-time'],
              revenue_models: ['Paid'],
              host_intent_scores: ['Looking'],
              services_offered_options: ['Catering'],
              venue_services_offered_options: ['Catering'],
              host_services_offered_options: ['Event'],
            },
          },
        },
      },
    ];
    const { result } = renderHook(() => useCrmConfig(), { wrapper: wrapper(mocks) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.config.venue_types).toEqual(['Banquet Hall']);
  });
});

describe('useSuperCategories', () => {
  it('returns an empty options list while loading', () => {
    const { result } = renderHook(() => useSuperCategories(), { wrapper: wrapper([]) });
    expect(result.current.options).toEqual([]);
    expect(result.current.byId.size).toBe(0);
  });

  it('filters out inactive categories and sorts by sort_order then name', async () => {
    const mocks = [
      {
        request: { query: SUPER_CATEGORIES },
        result: {
          data: {
            categories: [
              { id: '1', name: 'Beta', icon_name: null, is_active: true, sort_order: 2 },
              { id: '2', name: 'Alpha', icon_name: null, is_active: true, sort_order: 1 },
              { id: '3', name: 'Gone', icon_name: null, is_active: false, sort_order: 0 },
              { id: '4', name: 'Atlas', icon_name: null, is_active: true, sort_order: 2 },
            ],
          },
        },
      },
    ];
    const { result } = renderHook(() => useSuperCategories(), { wrapper: wrapper(mocks) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options.map((o) => o.name)).toEqual(['Alpha', 'Atlas', 'Beta']);
    expect(result.current.byId.get('1')?.name).toBe('Beta');
    expect(result.current.byId.has('3')).toBe(false);
  });
});
