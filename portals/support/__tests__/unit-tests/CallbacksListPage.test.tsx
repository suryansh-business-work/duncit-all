import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import CallbacksListPage from '../../src/pages/callbacks/CallbacksListPage';
import { BOUNCER_CALLBACK_REQUESTS, type CallbackRequest } from '../../src/graphql/bouncer';
import { renderWithProviders } from './testkit';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

const req: CallbackRequest = {
  id: 'cb-1',
  ticket_no: 'CB-AAA111',
  status: 'PENDING',
  reason: 'call me',
  contact_phone: '+919800000000',
  contacted_at: null,
  duration_seconds: null,
  conclusion: null,
  created_at: new Date().toISOString(),
  user: { id: 'u1', name: 'Aman', phone: '+919800000000' },
  pod: null,
};

// No phone + a present pod exercises the opposite optional-field branches.
const bareReq: CallbackRequest = {
  ...req,
  id: 'cb-2',
  ticket_no: 'CB-BBB222',
  contact_phone: '',
  user: { id: 'u2', name: 'Dev', phone: null },
  pod: { id: 'p2', title: 'Sunday Brunch' },
};

const queryMock = (items: CallbackRequest[], status: string | null = null, search: string | null = null) => ({
  request: {
    query: BOUNCER_CALLBACK_REQUESTS,
    variables: { status, search, page: 1, page_size: 25, sort_by: 'created_at', sort_dir: 'desc' },
  },
  result: { data: { bouncerCallbackRequests: { items, total: items.length, page: 1, page_size: 25 } } },
});

describe('CallbacksListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<CallbacksListPage />, { mocks: [queryMock([])] });
    await waitFor(() => expect(screen.getByText(/no callback requests found/i)).toBeInTheDocument());
  });

  it('lists requests (with the ID column), refetches on live events and opens a detail row', async () => {
    renderWithProviders(<></>, {
      mocks: [queryMock([req, bareReq]), queryMock([req, bareReq]), queryMock([req, bareReq])],
      initialEntries: ['/callbacks'],
      routes: (
        <>
          <Route path="/callbacks" element={<CallbacksListPage />} />
          <Route path="/callbacks/:id" element={<div>CALLBACK DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    expect(screen.getByText('CB-AAA111')).toBeInTheDocument();
    // Nullable pod cell: title when present, em-dash otherwise.
    expect(screen.getByText('Sunday Brunch')).toBeInTheDocument();
    act(() => {
      sockMock.events.onCallback();
      sockMock.events.onCallbackUpdate();
    });
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Aman'));
    await waitFor(() => expect(screen.getByText('CALLBACK DETAIL')).toBeInTheDocument());
  });

  it('filters by status (Resolved sends CLOSED) from the filter popover', async () => {
    renderWithProviders(<CallbacksListPage />, {
      mocks: [queryMock([req]), queryMock([], 'CLOSED')],
    });
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Resolved' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(screen.getByText(/no callback requests found/i)).toBeInTheDocument());
    expect(screen.queryByText('Aman')).not.toBeInTheDocument();
  });

  it('searches on the server (a debounced query keyed on the search variable)', async () => {
    renderWithProviders(<CallbacksListPage />, {
      mocks: [queryMock([req]), queryMock([bareReq], null, 'Brunch')],
    });
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox', { name: 'Search reason or phone' }), {
      target: { value: 'Brunch' },
    });
    await waitFor(() => expect(screen.queryByText('Aman')).not.toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.getByText('Dev')).toBeInTheDocument();
  });
});
