import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import SosDetailsPage from '../../src/pages/sos/SosDetailsPage';
import {
  ACK_SOS,
  BOUNCER_SOS_ALERTS,
  RESOLVE_SOS,
  type SosAlert,
} from '../../src/graphql/bouncer';
import { renderWithProviders } from './testkit';

const ID = 'sos-1';

const fullAlert = (status: SosAlert['status']): SosAlert => ({
  id: ID,
  status,
  message: 'Help, feeling unsafe',
  contact_phone: '+919800000000',
  acknowledged_at: null,
  resolved_at: null,
  created_at: new Date().toISOString(),
  location: { lat: 19.07, lng: 72.87, accuracy: 12 },
  user: { id: 'u1', name: 'Riya', phone: '+919800000000', avatar_url: null },
  host: { id: 'h1', name: 'Sam', phone: '+919811111111' },
  pod: { id: 'p1', title: 'Saturday Run', venue_name: 'Park', club_name: 'Runners', starts_at: null },
});

const minimalResolved: SosAlert = {
  id: ID,
  status: 'RESOLVED',
  message: '',
  contact_phone: '',
  acknowledged_at: null,
  resolved_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  location: null,
  user: { id: 'u1', name: 'Riya', phone: null, avatar_url: null },
  host: null,
  pod: { id: 'p1', title: 'Saturday Run', venue_name: null, club_name: null, starts_at: null },
};

const queryMock = (alerts: SosAlert[]) => ({
  request: { query: BOUNCER_SOS_ALERTS, variables: { status: null } },
  result: { data: { bouncerSosAlerts: alerts } },
});

const renderAt = (mocks: any[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/sos/${ID}`],
    routes: (
      <>
        <Route path="/sos/:id" element={<SosDetailsPage />} />
        <Route path="/sos" element={<div>SOS LIST</div>} />
      </>
    ),
  });

describe('SosDetailsPage', () => {
  it('shows a not-found message when the alert is missing', async () => {
    renderAt([queryMock([])]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('acknowledges then resolves an active alert', async () => {
    renderAt([
      queryMock([fullAlert('ACTIVE')]),
      { request: { query: ACK_SOS, variables: { id: ID } }, result: { data: { acknowledgeBouncerSos: { id: ID, status: 'ACKNOWLEDGED', acknowledged_at: 'now' } } } },
      queryMock([fullAlert('ACKNOWLEDGED')]),
      { request: { query: RESOLVE_SOS, variables: { id: ID } }, result: { data: { resolveBouncerSos: { id: ID, status: 'RESOLVED', resolved_at: 'now' } } } },
      queryMock([fullAlert('RESOLVED')]),
    ]);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByText('Open in Maps')).toBeInTheDocument();
    expect(screen.getByText(/Sam/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /mark resolved/i })).not.toBeInTheDocument());
  });

  it('renders a resolved alert with no optional details and no actions', async () => {
    renderAt([queryMock([minimalResolved])]);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.queryByText('Open in Maps')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark resolved/i })).not.toBeInTheDocument();
  });

  it('renders an acknowledged alert whose host has no phone', async () => {
    const ack = { ...fullAlert('ACKNOWLEDGED'), host: { id: 'h1', name: 'Sam', phone: null } };
    renderAt([queryMock([ack])]);
    await waitFor(() => expect(screen.getByText(/Sam/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });

  it('navigates back to the list', async () => {
    renderAt([queryMock([fullAlert('ACTIVE')])]);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('SOS LIST')).toBeInTheDocument();
  });
});
