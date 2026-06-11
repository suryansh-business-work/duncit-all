import { describe, expect, it } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackDetailsPage from '../../src/pages/feedback/FeedbackDetailsPage';
import { BOUNCER_FEEDBACK, type FeedbackEntry } from '../../src/graphql/bouncer';
import { renderWithProviders } from './testkit';

const ID = 'fb-1';

const full: FeedbackEntry = {
  id: ID,
  rating: 4,
  category: 'SAFETY',
  message: 'Felt very safe, great host',
  created_at: new Date().toISOString(),
  user: { id: 'u1', name: 'Sofia' },
  host: { id: 'h1', name: 'Sam' },
  pod: { id: 'p1', title: 'Night Walk', venue_name: 'Marine Drive' },
};

const minimal: FeedbackEntry = {
  id: ID,
  rating: 3,
  category: 'OTHER',
  message: '',
  created_at: new Date().toISOString(),
  user: { id: 'u1', name: 'Sofia' },
  host: null,
  pod: { id: 'p1', title: 'Night Walk', venue_name: null },
};

const queryMock = (items: FeedbackEntry[]) => ({
  request: { query: BOUNCER_FEEDBACK },
  result: { data: { bouncerFeedback: items } },
});

const renderAt = (mocks: any[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/feedback/${ID}`],
    routes: (
      <>
        <Route path="/feedback/:id" element={<FeedbackDetailsPage />} />
        <Route path="/feedback" element={<div>FEEDBACK LIST</div>} />
      </>
    ),
  });

describe('FeedbackDetailsPage', () => {
  it('shows a not-found message when missing', async () => {
    renderAt([queryMock([])]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('renders full feedback with host, venue and message', async () => {
    renderAt([queryMock([full])]);
    await waitFor(() => expect(screen.getByText(/Sofia/)).toBeInTheDocument());
    expect(screen.getByText('SAFETY')).toBeInTheDocument();
    expect(screen.getByText(/Felt very safe/)).toBeInTheDocument();
    expect(screen.getByText(/Marine Drive/)).toBeInTheDocument();
  });

  it('renders minimal feedback without host, venue or message', async () => {
    renderAt([queryMock([minimal])]);
    await waitFor(() => expect(screen.getByText(/Sofia/)).toBeInTheDocument());
    expect(screen.getByText('OTHER')).toBeInTheDocument();
  });

  it('navigates back to the list', async () => {
    renderAt([queryMock([full])]);
    await waitFor(() => expect(screen.getByText(/Sofia/)).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('FEEDBACK LIST')).toBeInTheDocument();
  });
});
