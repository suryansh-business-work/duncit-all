import { screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import type { LiteEventCard } from '../../../../shared/graphql/documents';
import { EventListPage } from '../../../components/events/EventListPage';
import { LITE_EVENTS } from '../../../graphql/events';
import { eventCardFixture, renderWithProviders, typed } from '../../test-utils';

const FILTER = { city_slug: 'delhi' };

const pageMock = (page: number, rows: LiteEventCard[], total: number): MockedResponse => ({
  request: { query: LITE_EVENTS, variables: { filter: FILTER, page, page_size: 18 } },
  result: { data: { liteEvents: typed('LiteEventPage', { rows, total, page, page_size: 18 }) } },
});

const event = (n: number) => eventCardFixture({ id: `ev-${n}`, slug: `event-${n}`, title: `Event ${n}` });

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(
    <EventListPage title="Events in Delhi" subtitle="3 upcoming events" filter={FILTER} emptyTitle="Nothing in Delhi" emptyBody="Check back soon." toolbar={<p>Toolbar</p>} />,
    { mocks },
  );

describe('EventListPage', () => {
  it('heads the page, shows its toolbar, and waits for the first page', async () => {
    renderPage([pageMock(1, [event(1)], 1)]);
    expect(screen.getByRole('heading', { level: 1, name: 'Events in Delhi' })).toBeInTheDocument();
    expect(screen.getByText('3 upcoming events')).toBeInTheDocument();
    expect(screen.getByText('Toolbar')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(await screen.findByText('Event 1')).toBeInTheDocument();
  });

  it('offers no Load more when every event is on the page', async () => {
    renderPage([pageMock(1, [event(1), event(2)], 2)]);
    await screen.findByText('Event 2');
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('loads the next page beneath the first, and stops offering more at the end', async () => {
    const { user } = renderPage([pageMock(1, [event(1), event(2)], 19), pageMock(2, [event(3)], 19)]);
    await user.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Event 3')).toBeInTheDocument();
    expect(screen.getAllByTestId('event-card').map((card) => card.textContent)).toEqual([
      expect.stringContaining('Event 1'),
      expect.stringContaining('Event 2'),
      expect.stringContaining('Event 3'),
    ]);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument());
  });

  it('shows the empty copy when the filter matches nothing', async () => {
    renderPage([pageMock(1, [], 0)]);
    const empty = await screen.findByTestId('empty-state');
    expect(empty).toHaveTextContent('Nothing in Delhi');
    expect(empty).toHaveTextContent('Check back soon.');
  });

  it('shows the API’s message when the list cannot be read', async () => {
    renderPage([{ request: { query: LITE_EVENTS, variables: { filter: FILTER, page: 1, page_size: 18 } }, result: { errors: [{ message: 'Events are resting' }] } }]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Events are resting');
  });
});
