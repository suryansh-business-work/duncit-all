import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CallbackDetailsPage from '../../src/pages/callbacks/CallbackDetailsPage';
import {
  BOUNCER_CALLBACK_REQUESTS,
  CLOSE_CALLBACK,
  MARK_CALLBACK_CONTACTED,
  type CallbackRequest,
} from '../../src/graphql/bouncer';
import { renderWithProviders } from './testkit';

const ID = 'cb-1';

const req = (status: CallbackRequest['status'], extras: Partial<CallbackRequest> = {}): CallbackRequest => ({
  id: ID,
  status,
  reason: 'Call me about my booking',
  contact_phone: '+919800000000',
  contacted_at: null,
  created_at: new Date().toISOString(),
  user: { id: 'u1', name: 'Aman', phone: '+919800000000' },
  pod: { id: 'p1', title: 'Sunday Brunch' },
  ...extras,
});

const queryMock = (items: CallbackRequest[]) => ({
  request: { query: BOUNCER_CALLBACK_REQUESTS },
  result: { data: { bouncerCallbackRequests: items } },
});

const renderAt = (mocks: any[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/callbacks/${ID}`],
    routes: (
      <>
        <Route path="/callbacks/:id" element={<CallbackDetailsPage />} />
        <Route path="/callbacks" element={<div>CALLBACK LIST</div>} />
      </>
    ),
  });

describe('CallbackDetailsPage', () => {
  it('shows a not-found message when missing', async () => {
    renderAt([queryMock([])]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('marks contacted then closes a pending request', async () => {
    renderAt([
      queryMock([req('PENDING')]),
      { request: { query: MARK_CALLBACK_CONTACTED, variables: { id: ID } }, result: { data: { markBouncerCallbackContacted: { id: ID, status: 'CONTACTED', contacted_at: 'now' } } } },
      queryMock([req('CONTACTED')]),
      { request: { query: CLOSE_CALLBACK, variables: { id: ID } }, result: { data: { closeBouncerCallback: { id: ID, status: 'CLOSED' } } } },
      queryMock([req('CLOSED')]),
    ]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark contacted/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /mark contacted/i })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument());
  });

  it('renders a closed request with no phone or pod and no actions', async () => {
    renderAt([queryMock([req('CLOSED', { contact_phone: '', pod: null, reason: '' })])]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('navigates back to the list', async () => {
    renderAt([queryMock([req('PENDING')])]);
    await waitFor(() => expect(screen.getByText('Aman')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('CALLBACK LIST')).toBeInTheDocument();
  });
});
