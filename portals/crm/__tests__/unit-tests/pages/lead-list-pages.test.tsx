import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import VenueLeadsPage from '@/pages/venue-leads/VenueLeadsPage';
import HostLeadsPage from '@/pages/host-leads/HostLeadsPage';
import { HOST_LEADS_TABLE, VENUE_LEADS_TABLE } from '@/api/crm.gql';

// tableQueryToGql() of DuncitTable's initial state (defaultSort next_follow_up_date asc).
const tableVars = {
  query: {
    search: null,
    page: 1,
    page_size: 25,
    sort_by: 'next_follow_up_date',
    sort_dir: 'asc',
    filters: [],
  },
};

const wrap = (ui: React.ReactElement, mocks: any[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter>{ui}</MemoryRouter>
    </MockedProvider>
  );

beforeEach(() => {
  window.localStorage.clear();
});

describe('VenueLeadsPage', () => {
  it('renders the toolbar title and the create action with no leads loaded yet', async () => {
    wrap(<VenueLeadsPage />, [
      {
        request: { query: VENUE_LEADS_TABLE, variables: tableVars },
        result: { data: { venueLeadsTable: { total: 0, rows: [] } } },
      },
    ]);
    expect(await screen.findByRole('heading', { name: /Venue Leads/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /New Venue Lead/i })).toBeTruthy();
  });
});

describe('HostLeadsPage', () => {
  it('renders the toolbar title and the create action with no leads loaded yet', async () => {
    wrap(<HostLeadsPage />, [
      {
        request: { query: HOST_LEADS_TABLE, variables: tableVars },
        result: { data: { hostLeadsTable: { total: 0, rows: [] } } },
      },
    ]);
    expect(await screen.findByRole('heading', { name: /Host Leads/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /New Host Lead/i })).toBeTruthy();
  });
});
