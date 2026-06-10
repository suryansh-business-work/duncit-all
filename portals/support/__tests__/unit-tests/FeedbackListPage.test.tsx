import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackListPage from '../../src/pages/feedback/FeedbackListPage';
import { BOUNCER_FEEDBACK, type FeedbackEntry } from '../../src/graphql/bouncer';
import { renderWithProviders } from './testkit';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

const fb: FeedbackEntry = {
  id: 'fb-1',
  rating: 5,
  category: 'HOST',
  message: 'great',
  created_at: new Date().toISOString(),
  user: { id: 'u1', name: 'Sofia' },
  host: null,
  pod: { id: 'p1', title: 'Night Walk', venue_name: null },
};

// A second entry with a venue name covers the venue-label branch.
const venueFb: FeedbackEntry = {
  ...fb,
  id: 'fb-2',
  user: { id: 'u2', name: 'Dev' },
  pod: { id: 'p2', title: 'Brunch', venue_name: 'Cafe Bloom' },
};

const queryMock = (items: FeedbackEntry[]) => ({
  request: { query: BOUNCER_FEEDBACK },
  result: { data: { bouncerFeedback: items } },
});

describe('FeedbackListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<FeedbackListPage />, { mocks: [queryMock([])] });
    await waitFor(() => expect(screen.getByText(/no feedback yet/i)).toBeInTheDocument());
  });

  it('lists feedback, refetches on live events and opens a detail row', async () => {
    renderWithProviders(<></>, {
      mocks: [queryMock([fb, venueFb]), queryMock([fb, venueFb])],
      initialEntries: ['/feedback'],
      routes: (
        <>
          <Route path="/feedback" element={<FeedbackListPage />} />
          <Route path="/feedback/:id" element={<div>FEEDBACK DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Sofia')).toBeInTheDocument());
    sockMock.events.onFeedback();
    fireEvent.click(screen.getByText('Sofia'));
    expect(screen.getByText('FEEDBACK DETAIL')).toBeInTheDocument();
  });
});
