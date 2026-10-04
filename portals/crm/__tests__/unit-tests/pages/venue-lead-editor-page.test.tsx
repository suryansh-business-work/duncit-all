import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import VenueLeadEditorPage from '@/pages/venue-leads/VenueLeadEditorPage';
import { CREATE_VENUE_LEAD, UPDATE_VENUE_LEAD, VENUE_LEAD } from '@/api/crm.gql';
import type { VenueLead } from '@/api/crm.types';
import { venueLead } from '../fixtures/leads';

const SUPER = '64a000000000000000000001';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

const renderEditor = (entry: string | { pathname: string; state: unknown }, mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[entry]}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Routes>
            <Route path="/venue-leads/new" element={<VenueLeadEditorPage />} />
            <Route path="/venue-leads/:id" element={<VenueLeadEditorPage />} />
            <Route path="*" element={null} />
          </Routes>
          <LocationProbe />
        </LocalizationProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

const leadMock = (value: (VenueLead & { matched_user: null }) | null): MockedResponse => ({
  request: { query: VENUE_LEAD, variables: { id: 'venue-1' } },
  result: { data: { venueLead: value } },
});

/** A mutation mock that accepts any variables and records what it was sent. */
const capture = (query: typeof CREATE_VENUE_LEAD, field: string, sent: Record<string, any>[]): MockedResponse => ({
  request: {
    query,
    variables: (vars: Record<string, any>) => {
      sent.push(vars);
      return true;
    },
  },
  result: { data: { [field]: venueLead() } },
});

const aiPrefill = {
  super_category_id: SUPER,
  venue_name: 'Sky Lounge',
  venue_types: ['Rooftop'],
  city: 'Pune',
  full_address: '1 MG Road, Camp, Pune',
  contacts: [{ name: 'Asha', role: 'Owner', mobile_number: '9876543210', whatsapp_number: '', email: 'asha@example.com' }],
};

describe('VenueLeadEditorPage', () => {
  it('creates a lead from an AI-prefilled draft and returns to the list', async () => {
    const sent: Record<string, any>[] = [];
    renderEditor({ pathname: '/venue-leads/new', state: { aiPrefill } }, [capture(CREATE_VENUE_LEAD, 'createVenueLead', sent)]);

    expect(await screen.findByRole('heading', { level: 1, name: 'New Venue Lead' })).toBeInTheDocument();
    expect(screen.getByText('AI-prefilled draft — review every section before saving.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create venue lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads$/));
    expect(sent.at(-1)?.input).toEqual(
      expect.objectContaining({
        super_category_id: SUPER,
        venue_name: 'Sky Lounge',
        venue_types: ['Rooftop'],
        city: 'Pune',
        full_address: '1 MG Road, Camp, Pune',
        contacts: [aiPrefill.contacts[0]],
      }),
    );
    expect(sent.at(-1)).not.toHaveProperty('id');
  });

  it('starts a blank create form without the AI notice when no draft was handed over', async () => {
    renderEditor('/venue-leads/new', []);

    expect(await screen.findByRole('heading', { level: 1, name: 'New Venue Lead' })).toBeInTheDocument();
    expect(screen.queryByText(/AI-prefilled draft/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Create venue lead' })).toBeInTheDocument();
  });

  it('updates an existing lead by id and returns to the list', async () => {
    const sent: Record<string, any>[] = [];
    renderEditor('/venue-leads/venue-1', [
      leadMock({ ...venueLead({ super_category_id: SUPER }), matched_user: null }),
      capture(UPDATE_VENUE_LEAD, 'updateVenueLead', sent),
    ]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Grand Hall' })).toBeInTheDocument();
    // An AI notice only belongs to new drafts.
    expect(screen.queryByText(/AI-prefilled draft/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Update venue lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads$/));
    expect(sent.at(-1)?.id).toBe('venue-1');
    expect(sent.at(-1)?.input).toEqual(
      expect.objectContaining({ venue_name: 'Grand Hall', super_category_id: SUPER, city: 'Pune', capacity_max: 300 }),
    );
  });

  it('keeps the editor open and shows the server error when saving fails', async () => {
    renderEditor('/venue-leads/venue-1', [
      leadMock({ ...venueLead({ super_category_id: SUPER }), matched_user: null }),
      { request: { query: UPDATE_VENUE_LEAD, variables: () => true }, error: new Error('Venue lead is locked') },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Update venue lead' }));

    expect(await screen.findByText('Venue lead is locked')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/venue-leads/venue-1');
  });

  it('shows not-found when the lead id does not resolve', async () => {
    renderEditor('/venue-leads/venue-1', [leadMock(null)]);

    expect(await screen.findByText('Venue lead not found.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('cancels back to the list', async () => {
    renderEditor('/venue-leads/new', []);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads$/);
  });
});
