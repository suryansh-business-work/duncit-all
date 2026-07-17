import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import SosListPage from '../../src/pages/sos/SosListPage';
import { renderWithProviders } from '../testkit';
import { makeBouncerActor, makeBouncerPod, makeSosAlert, sosAlertsMock } from '../mocks/sos.mock';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

const alert = makeSosAlert();

// A second alert with no venue name and no phone exercises the fallback branches.
const bareAlert = makeSosAlert({
  id: 'sos-2',
  ticket_no: 'SOS-BBB222',
  contact_phone: '',
  user: makeBouncerActor({ id: 'u2', name: 'Dev' }),
  pod: makeBouncerPod({ id: 'p2', title: 'Yoga', venue_name: null }),
});

describe('SosListPage', () => {
  it('shows an empty state when there are no alerts', async () => {
    renderWithProviders(<SosListPage />, { mocks: [sosAlertsMock([])] });
    await waitFor(() => expect(screen.getByText(/no sos alerts found/i)).toBeInTheDocument());
  });

  it('renders alerts (with the ID column) and navigates to a detail row, and live events refetch', async () => {
    renderWithProviders(<></>, {
      mocks: [sosAlertsMock([alert, bareAlert]), sosAlertsMock([alert, bareAlert]), sosAlertsMock([alert, bareAlert])],
      initialEntries: ['/sos'],
      routes: (
        <>
          <Route path="/sos" element={<SosListPage />} />
          <Route path="/sos/:id" element={<div>SOS DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByText('SOS-AAA111')).toBeInTheDocument();
    // Computed Pod cell: title + venue when present, bare title otherwise.
    expect(screen.getByText('Saturday Run · Park')).toBeInTheDocument();
    expect(screen.getByText('Yoga')).toBeInTheDocument();

    // Live socket callbacks trigger a refetch without throwing.
    act(() => {
      sockMock.events.onSos();
      sockMock.events.onSosUpdate();
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Riya'));
    await waitFor(() => expect(screen.getByText('SOS DETAIL')).toBeInTheDocument());
  });

  it('filters by status (Active sends ACTIVE) from the filter popover', async () => {
    renderWithProviders(<SosListPage />, {
      mocks: [sosAlertsMock([alert]), sosAlertsMock([], { status: 'ACTIVE' })],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Active' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(screen.getByText(/no sos alerts found/i)).toBeInTheDocument());
    expect(screen.queryByText('Riya')).not.toBeInTheDocument();
  });

  it('searches on the server (a debounced query keyed on the search variable)', async () => {
    renderWithProviders(<SosListPage />, {
      mocks: [sosAlertsMock([alert]), sosAlertsMock([bareAlert], { search: 'BBB222' })],
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox', { name: 'Search message or phone' }), {
      target: { value: 'BBB222' },
    });
    await waitFor(() => expect(screen.queryByText('Riya')).not.toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.getByText('Dev')).toBeInTheDocument();
  });
});
