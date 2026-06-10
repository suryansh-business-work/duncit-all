import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import VenueLeadsPage from '@/pages/venue-leads/VenueLeadsPage';
import HostLeadsPage from '@/pages/host-leads/HostLeadsPage';
import { HOST_LEADS, VENUE_LEADS } from '@/api/crm.gql';

const baseFilter = {
  filter: { search: '', lead_status: null, priority: null, super_category_id: null },
};

const wrap = (ui: React.ReactElement, mocks: any[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter>{ui}</MemoryRouter>
    </MockedProvider>
  );

describe('VenueLeadsPage', () => {
  it('renders the toolbar title with no leads loaded yet', async () => {
    wrap(<VenueLeadsPage />, [
      { request: { query: VENUE_LEADS, variables: baseFilter }, result: { data: { venueLeads: [] } } },
    ]);
    expect(await screen.findByText(/Venue Leads/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /New Venue Lead/i })).toBeTruthy();
  });
});

describe('HostLeadsPage', () => {
  it('renders the toolbar title with no leads loaded yet', async () => {
    wrap(<HostLeadsPage />, [
      { request: { query: HOST_LEADS, variables: baseFilter }, result: { data: { hostLeads: [] } } },
    ]);
    expect(await screen.findByText(/Host Leads/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /New Host Lead/i })).toBeTruthy();
  });
});
