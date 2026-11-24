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

/**
 * Records whether `text` ever appeared in the page. The editor's notice is a Snackbar that hides
 * itself after 4 s; under coverage on CI one remount can block the thread longer than that, so a
 * query run afterwards finds it already gone. Call `stop()` when done.
 */
function watchForText(text: string) {
  let seen = document.body.textContent?.includes(text) ?? false;
  const observer = new MutationObserver(() => {
    if (!seen && document.body.textContent?.includes(text)) seen = true;
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return { seen: () => seen, stop: () => observer.disconnect() };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
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

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads$/), { timeout: 3000 });
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

  it('updates an existing lead by id and returns to its detail page, not the list', async () => {
    const sent: Record<string, any>[] = [];
    renderEditor('/venue-leads/venue-1', [
      leadMock({ ...venueLead({ super_category_id: SUPER }), matched_user: null }),
      capture(UPDATE_VENUE_LEAD, 'updateVenueLead', sent),
    ]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Grand Hall' })).toBeInTheDocument();
    // An AI notice only belongs to new drafts.
    expect(screen.queryByText(/AI-prefilled draft/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Update venue lead' }));

    // Validate → mutate → navigate takes over 1s under v8 coverage on CI.
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads\/venue-1\/view$/), { timeout: 3000 });
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

    // The whole form renders before the save can fail; under v8 coverage that outlasts the 1 s default.
    expect(await screen.findByText('Venue lead is locked', {}, { timeout: 3000 })).toBeInTheDocument();
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

  it('returns to the page the editor was opened from, query string included', async () => {
    const from = '/venue-leads/venue-1/view?tab=contacts';
    renderEditor({ pathname: '/venue-leads/venue-1', state: { from } }, [
      leadMock({ ...venueLead({ super_category_id: SUPER }), matched_user: null }),
      capture(UPDATE_VENUE_LEAD, 'updateVenueLead', []),
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Update venue lead' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(from), { timeout: 3000 });
  });

  it('cancelling an edit with no recorded origin goes to the lead, not the list', async () => {
    renderEditor('/venue-leads/venue-1', [leadMock({ ...venueLead({ super_category_id: SUPER }), matched_user: null })]);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads\/venue-1\/view$/);
  });

  it('Update & Continue saves the lead and keeps the user on its editor', async () => {
    const sent: Record<string, any>[] = [];
    renderEditor('/venue-leads/venue-1', [
      leadMock({ ...venueLead({ super_category_id: SUPER }), matched_user: null }),
      capture(UPDATE_VENUE_LEAD, 'updateVenueLead', sent),
    ]);

    fireEvent.change(await screen.findByRole('textbox', { name: /Venue Name/ }), { target: { value: 'Grand Hall Annexe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update & Continue' }));

    expect(await screen.findByText('Lead updated. Keep editing or go back when you are done.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual(expect.objectContaining({ id: 'venue-1', input: expect.objectContaining({ venue_name: 'Grand Hall Annexe' }) }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads\/venue-1$/);
    expect(screen.getByRole('textbox', { name: /Venue Name/ })).toHaveValue('Grand Hall Annexe');
  });

  it('Create & Continue moves the new lead onto its edit URL so the next save updates it', async () => {
    const created: Record<string, any>[] = [];
    const updated: Record<string, any>[] = [];
    renderEditor({ pathname: '/venue-leads/new', state: { aiPrefill, from: '/venue-leads?status=New' } }, [
      capture(CREATE_VENUE_LEAD, 'createVenueLead', created),
      // The edit route reads the lead more than once (mount, then cache-and-network after the
      // create wrote it); a single-use mock left the later reads unanswered.
      { ...leadMock({ ...venueLead({ super_category_id: SUPER }), matched_user: null }), maxUsageCount: 5 },
      capture(UPDATE_VENUE_LEAD, 'updateVenueLead', updated),
    ]);

    // Two full editor mounts and two saves: under v8 coverage on CI the create has landed after
    // 3 s, so each step gets 10 s of the file's 30 s test budget.
    const slow = { timeout: 10_000 };
    // Press only once the AI draft is in the form. Under coverage on CI the button rendered before
    // the prefill landed, the submit stopped at validation and the URL stayed on /venue-leads/new.
    expect(await screen.findByDisplayValue('Sky Lounge', {}, slow)).toBeInTheDocument();
    // The notice is only ever set by the navigation onto the edit URL, so seeing it at all proves
    // it survived the remount instead of dying with the /new editor.
    const notice = watchForText('Lead created. You can keep adding details.');
    fireEvent.click(await screen.findByRole('button', { name: 'Create & Continue' }));
    await waitFor(() => expect(created).toHaveLength(1), slow);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/venue-leads\/venue-1$/), slow);
    await waitFor(() => expect(notice.seen()).toBe(true), slow);
    notice.stop();
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Grand Hall' }, slow)).toBeInTheDocument();

    // The follow-up save updates the lead just created and still returns to the original list view.
    fireEvent.click(screen.getByRole('button', { name: 'Update venue lead' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/venue-leads?status=New'), slow);
    expect(created).toHaveLength(1);
    expect(updated.at(-1)?.id).toBe('venue-1');
  });
});
