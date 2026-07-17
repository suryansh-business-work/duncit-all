import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import CallbacksListPage from '../../src/pages/callbacks/CallbacksListPage';
import { renderWithProviders } from '../testkit';
import {
  callbackRequestsMock,
  makeCallbackActor,
  makeCallbackPod,
  makeCallbackRequest,
} from '../mocks/callback.mock';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

const req = makeCallbackRequest({ reason: 'call me', pod: null });

// No phone + a present pod exercises the opposite optional-field branches.
const bareReq = makeCallbackRequest({
  id: 'cb-2',
  ticket_no: 'CB-BBB222',
  reason: 'call me',
  contact_phone: '',
  user: makeCallbackActor({ id: 'u2', name: 'Dev', phone: null }),
  pod: makeCallbackPod({ id: 'p2', title: 'Sunday Brunch' }),
});

describe('CallbacksListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<CallbacksListPage />, { mocks: [callbackRequestsMock([])] });
    await waitFor(() => expect(screen.getByText(/no callback requests found/i)).toBeInTheDocument());
  });

  it('lists requests (with the ID column), refetches on live events and opens a detail row', async () => {
    renderWithProviders(<></>, {
      mocks: [callbackRequestsMock([req, bareReq]), callbackRequestsMock([req, bareReq]), callbackRequestsMock([req, bareReq])],
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
      mocks: [callbackRequestsMock([req]), callbackRequestsMock([], { status: 'CLOSED' })],
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
      mocks: [callbackRequestsMock([req]), callbackRequestsMock([bareReq], { search: 'Brunch' })],
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
