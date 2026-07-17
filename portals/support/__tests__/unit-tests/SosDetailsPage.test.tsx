import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { type MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import SosDetailsPage from '../../src/pages/sos/SosDetailsPage';
import { renderWithProviders } from '../testkit';
import {
  ackSosMock,
  makeBouncerActor,
  makeBouncerGeo,
  makeBouncerPod,
  makeSosAlert,
  resolveSosMock,
  sosAlertMock,
  type SosAlertMock,
} from '../mocks/sos.mock';

const ID = 'sos-1';

const fullAlert = (status: SosAlertMock['status']): SosAlertMock =>
  makeSosAlert({
    status,
    message: 'Help, feeling unsafe',
    location: makeBouncerGeo(),
    user: makeBouncerActor({ name: 'Riya', phone: '+919800000000' }),
    host: makeBouncerActor({ id: 'h1', name: 'Sam', phone: '+919811111111' }),
    pod: makeBouncerPod({ club_name: 'Runners' }),
  });

const minimalResolved: SosAlertMock = makeSosAlert({
  ticket_no: 'SOS-BBB222',
  status: 'RESOLVED',
  message: '',
  contact_phone: '',
  resolved_at: new Date().toISOString(),
  pod: makeBouncerPod({ venue_name: null }),
});

const renderAt = (mocks: MockedResponse[]) =>
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
    renderAt([sosAlertMock(null)]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('acknowledges then resolves an active alert', async () => {
    renderAt([
      sosAlertMock(fullAlert('ACTIVE')),
      ackSosMock(),
      sosAlertMock(fullAlert('ACKNOWLEDGED')),
      resolveSosMock(),
      sosAlertMock(fullAlert('RESOLVED')),
    ]);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.getByText('SOS-AAA111')).toBeInTheDocument();
    expect(screen.getByText('Open in Maps')).toBeInTheDocument();
    expect(screen.getByText(/Sam/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /mark resolved/i })).not.toBeInTheDocument());
  });

  it('renders a resolved alert with no optional details and no actions', async () => {
    renderAt([sosAlertMock(minimalResolved)]);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    expect(screen.queryByText('Open in Maps')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark resolved/i })).not.toBeInTheDocument();
  });

  it('renders an acknowledged alert whose host has no phone', async () => {
    const ack = makeSosAlert({
      ...fullAlert('ACKNOWLEDGED'),
      host: makeBouncerActor({ id: 'h1', name: 'Sam', phone: null }),
    });
    renderAt([sosAlertMock(ack)]);
    await waitFor(() => expect(screen.getByText(/Sam/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
  });

  it('navigates back to the list', async () => {
    renderAt([sosAlertMock(fullAlert('ACTIVE'))]);
    await waitFor(() => expect(screen.getByText('Riya')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('SOS LIST')).toBeInTheDocument();
  });
});
