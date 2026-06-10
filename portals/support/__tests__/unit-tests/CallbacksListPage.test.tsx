import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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
  status: 'PENDING',
  reason: 'call me',
  contact_phone: '+919800000000',
  contacted_at: null,
  created_at: new Date().toISOString(),
  user: { id: 'u1', name: 'Aman', phone: '+919800000000' },
  pod: null,
};

// No phone + a present pod exercises the opposite optional-field branches.
const bareReq: CallbackRequest = {
  ...req,
  id: 'cb-2',
  contact_phone: '',
  user: { id: 'u2', name: 'Dev', phone: null },
  pod: { id: 'p2', title: 'Sunday Brunch' },
};

const queryMock = (items: CallbackRequest[]) => ({
  request: { query: BOUNCER_CALLBACK_REQUESTS },
  result: { data: { bouncerCallbackRequests: items } },
});

describe('CallbacksListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<CallbacksListPage />, { mocks: [queryMock([])] });
    await waitFor(() => expect(screen.getByText(/no callback requests yet/i)).toBeInTheDocument());
  });

  it('lists requests, refetches on live events and opens a detail row', async () => {
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
    sockMock.events.onCallback();
    sockMock.events.onCallbackUpdate();
    fireEvent.click(screen.getByText('Aman'));
    expect(screen.getByText('CALLBACK DETAIL')).toBeInTheDocument();
  });
});
