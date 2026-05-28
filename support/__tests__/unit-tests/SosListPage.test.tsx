import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import SosListPage from '../../src/pages/sos/SosListPage';
import { BOUNCER_SOS_ALERTS, type SosAlert } from '../../src/graphql/bouncer';
import { renderWithProviders } from './testkit';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

const alert: SosAlert = {
  id: 'sos-1',
  status: 'ACTIVE',
  message: 'help',
  contact_phone: '+919800000000',
  acknowledged_at: null,
  resolved_at: null,
  created_at: new Date().toISOString(),
  location: null,
  user: { id: 'u1', name: 'Riya', phone: null, avatar_url: null },
  host: null,
  pod: { id: 'p1', title: 'Saturday Run', venue_name: 'Park', club_name: null, starts_at: null },
};

// A second alert with no venue name and no phone exercises the fallback branches.
const bareAlert: SosAlert = {
  ...alert,
  id: 'sos-2',
  contact_phone: '',
  user: { id: 'u2', name: 'Dev', phone: null, avatar_url: null },
  pod: { id: 'p2', title: 'Yoga', venue_name: null, club_name: null, starts_at: null },
};

const queryMock = (alerts: SosAlert[]) => ({
  request: { query: BOUNCER_SOS_ALERTS, variables: { status: null } },
  result: { data: { bouncerSosAlerts: alerts } },
});

describe('SosListPage', () => {
  it('shows an empty state when there are no alerts', async () => {
    renderWithProviders(<SosListPage />, { mocks: [queryMock([])] });
    await waitFor(() => expect(screen.getByText(/no sos alerts yet/i)).toBeInTheDocument());
  });

  it('renders alerts and navigates to a detail row, and live events refetch', async () => {
    renderWithProviders(<></>, {
      mocks: [queryMock([alert, bareAlert]), queryMock([alert, bareAlert]), queryMock([alert, bareAlert])],
      initialEntries: ['/sos'],
      routes: (
        <>
          <Route path="/sos" element={<SosListPage />} />
          <Route path="/sos/:id" element={<div>SOS DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());

    // Live socket callbacks trigger a refetch without throwing.
    sockMock.events.onSos();
    sockMock.events.onSosUpdate();

    fireEvent.click(screen.getByText('Riya'));
    expect(screen.getByText('SOS DETAIL')).toBeInTheDocument();
  });
});
