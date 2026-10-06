import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import HostLeadEditorPage from '@/pages/host-leads/HostLeadEditorPage';
import { CREATE_HOST_LEAD, HOST_LEAD, UPDATE_HOST_LEAD } from '@/api/crm.gql';
import type { HostLead } from '@/api/crm.types';
import { hostLead } from '../fixtures/leads';

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
            <Route path="/host-leads/new" element={<HostLeadEditorPage />} />
            <Route path="/host-leads/:id" element={<HostLeadEditorPage />} />
            <Route path="*" element={null} />
          </Routes>
          <LocationProbe />
        </LocalizationProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

const leadMock = (value: (HostLead & { matched_user: null }) | null): MockedResponse => ({
  request: { query: HOST_LEAD, variables: { id: 'host-1' } },
  result: { data: { hostLead: value } },
});

/** A mutation mock that accepts any variables and records what it was sent. */
const capture = (query: typeof CREATE_HOST_LEAD, field: string, sent: Record<string, any>[]): MockedResponse => ({
  request: {
    query,
    variables: (vars: Record<string, any>) => {
      sent.push(vars);
      return true;
    },
  },
  result: { data: { [field]: hostLead() } },
});

const aiPrefill = {
  super_category_id: SUPER,
  host_name: 'Ravi Sharma',
  host_type: 'Individual',
  contacts: [{ name: 'Asha', role: 'Owner', mobile_number: '9876543210', whatsapp_number: '', email: 'asha@example.com' }],
};

describe('HostLeadEditorPage', () => {
  it('creates a lead from an AI-prefilled draft and returns to the list', async () => {
    const sent: Record<string, any>[] = [];
    renderEditor({ pathname: '/host-leads/new', state: { aiPrefill } }, [capture(CREATE_HOST_LEAD, 'createHostLead', sent)]);

    expect(await screen.findByRole('heading', { level: 1, name: 'New Host Lead' })).toBeInTheDocument();
    expect(screen.getByText('AI-prefilled draft — review every section before saving.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create host lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/host-leads$/));
    expect(sent.at(-1)?.input).toEqual(
      expect.objectContaining({
        super_category_id: SUPER,
        host_name: 'Ravi Sharma',
        host_type: 'Individual',
        contacts: [aiPrefill.contacts[0]],
      }),
    );
    expect(sent.at(-1)).not.toHaveProperty('id');
  });

  it('starts a blank create form without the AI notice when no draft was handed over', async () => {
    renderEditor('/host-leads/new', []);

    expect(await screen.findByRole('heading', { level: 1, name: 'New Host Lead' })).toBeInTheDocument();
    expect(screen.queryByText(/AI-prefilled draft/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Create host lead' })).toBeInTheDocument();
  });

  it('updates an existing lead by id and returns to the list', async () => {
    const sent: Record<string, any>[] = [];
    renderEditor('/host-leads/host-1', [
      leadMock({ ...hostLead({ super_category_id: SUPER }), matched_user: null }),
      capture(UPDATE_HOST_LEAD, 'updateHostLead', sent),
    ]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Pune Runners' })).toBeInTheDocument();
    // An AI notice only belongs to new drafts.
    expect(screen.queryByText(/AI-prefilled draft/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Update host lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/host-leads$/));
    expect(sent.at(-1)?.id).toBe('host-1');
    expect(sent.at(-1)?.input).toEqual(expect.objectContaining({ host_name: 'Pune Runners', super_category_id: SUPER, community_size: 400 }));
  });

  it('keeps the editor open and shows the server error when saving fails', async () => {
    renderEditor('/host-leads/host-1', [
      leadMock({ ...hostLead({ super_category_id: SUPER }), matched_user: null }),
      { request: { query: UPDATE_HOST_LEAD, variables: () => true }, error: new Error('Host lead is locked') },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Update host lead' }));

    expect(await screen.findByText('Host lead is locked')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/host-leads/host-1');
  });

  it('shows not-found when the lead id does not resolve', async () => {
    renderEditor('/host-leads/host-1', [leadMock(null)]);

    expect(await screen.findByText('Host lead not found.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('cancels back to the list', async () => {
    renderEditor('/host-leads/new', []);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/host-leads$/);
  });
});
