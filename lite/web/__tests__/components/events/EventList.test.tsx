import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventDayGroup } from '../../../components/events/EventDayGroup';
import { EventList } from '../../../components/events/EventList';
import { eventCardFixture, renderWithProviders } from '../../test-utils';

const saturday = eventCardFixture({ id: 'sat', slug: 'sat', title: 'Saturday picnic', start_at: '2026-11-21T05:00:00.000Z', end_at: '2026-11-21T08:00:00.000Z' });
const saturdayNight = eventCardFixture({ id: 'sat-night', slug: 'sat-night', title: 'Saturday gig', status: 'DRAFT' });
const sunday = eventCardFixture({ id: 'sun', slug: 'sun', title: 'Sunday run', start_at: '2026-11-22T01:00:00.000Z', end_at: '2026-11-22T03:00:00.000Z' });

describe('EventList', () => {
  it('shows a spinner while the first page loads', () => {
    renderWithProviders(<EventList events={[]} loading emptyTitle="Nothing here" />);
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument();
  });

  it('keeps showing the events it has while it refreshes', () => {
    renderWithProviders(<EventList events={[saturday]} loading emptyTitle="Nothing here" />);
    expect(screen.getByText('Saturday picnic')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says so, with the caller’s copy and action, when there are no events', () => {
    renderWithProviders(<EventList events={[]} emptyTitle="No events yet" emptyBody="Check back soon." emptyAction={<a href="/create">Host one</a>} />);
    const empty = screen.getByTestId('empty-state');
    expect(empty).toHaveTextContent('No events yet');
    expect(empty).toHaveTextContent('Check back soon.');
    expect(within(empty).getByRole('link', { name: 'Host one' })).toHaveAttribute('href', '/create');
  });

  it('groups the events under a heading for each day in the host’s zone', () => {
    renderWithProviders(<EventList events={[saturday, saturdayNight, sunday]} emptyTitle="Nothing here" />);
    const days = screen.getAllByTestId('event-day-group');
    expect(days).toHaveLength(2);
    expect(within(days[0]).getByRole('heading', { level: 2, name: 'Sat, 21 Nov 2026' })).toBeInTheDocument();
    expect(within(days[0]).getAllByRole('article')).toHaveLength(2);
    expect(within(days[1]).getByRole('heading', { level: 2, name: 'Sun, 22 Nov 2026' })).toBeInTheDocument();
    expect(within(days[1]).getByText('Sunday run')).toBeInTheDocument();
  });

  it('passes the host-list options on to every card', () => {
    renderWithProviders(<EventList events={[saturdayNight]} emptyTitle="Nothing here" showStatus cardTo={(event) => `/e/${event.slug}/manage`} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/e/sat-night/manage');
    expect(screen.getByTestId('event-status-chip')).toHaveTextContent('Draft');
  });
});

describe('EventDayGroup', () => {
  it('is a section headed by its day, with a card per event linking to the event page by default', () => {
    renderWithProviders(<EventDayGroup label="Sat, 21 Nov 2026" events={[saturday, saturdayNight]} />);
    const group = screen.getByTestId('event-day-group');
    expect(group.tagName).toBe('SECTION');
    expect(within(group).getByRole('heading', { level: 2, name: 'Sat, 21 Nov 2026' })).toBeInTheDocument();
    expect(within(group).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/e/sat', '/e/sat-night']);
    expect(within(group).queryByTestId('event-status-chip')).not.toBeInTheDocument();
  });
});
