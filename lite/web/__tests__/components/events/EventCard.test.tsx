import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LiteEventCard } from '../../../../shared/graphql/documents';
import { EventCard } from '../../../components/events/EventCard';
import { categoryFixture, eventCardFixture, hostFixture, renderWithProviders, ticketFixture } from '../../test-utils';

const renderCard = (over: Partial<LiteEventCard> = {}, props: { to?: string; showStatus?: boolean } = {}) =>
  renderWithProviders(<EventCard event={eventCardFixture(over)} {...props} />);

describe('EventCard', () => {
  it('is an article linking to the event, with its title, time in the host’s zone and place', () => {
    renderCard();
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/e/garden-party');
    expect(screen.getByRole('heading', { level: 3, name: 'Garden Party' })).toBeInTheDocument();
    expect(screen.getByText('Sat, 21 Nov 2026 · 7:00 PM – 9:30 PM')).toBeInTheDocument();
    expect(screen.getByText('Lodhi Garden · Delhi')).toBeInTheDocument();
    expect(screen.getByText('By Asha Rao')).toBeInTheDocument();
  });

  it('links where a host list asks instead of the event page', () => {
    renderCard({}, { to: '/e/garden-party/manage' });
    expect(screen.getByRole('link')).toHaveAttribute('href', '/e/garden-party/manage');
  });

  it('reads Free when every active ticket is free', () => {
    renderCard({ tickets: [ticketFixture({ price: 0 }), ticketFixture({ id: 'tk-2', price: 900, is_active: false })] });
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows the one active ticket’s price', () => {
    renderCard({ tickets: [ticketFixture({ price: 1250 })] });
    expect(screen.getByText('₹1,250')).toBeInTheDocument();
  });

  it('shows From the cheapest price when there are several paid tickets', () => {
    renderCard({ tickets: [ticketFixture({ price: 1500 }), ticketFixture({ id: 'tk-2', price: 500 })] });
    expect(screen.getByText('From ₹500')).toBeInTheDocument();
  });

  it('shows the category chip when there is one', () => {
    renderCard({ category: categoryFixture({ name: 'Music' }) });
    expect(screen.getByText('Music')).toBeInTheDocument();
  });

  it('says Online for a virtual event', () => {
    renderCard({ location_type: 'VIRTUAL' });
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.queryByText('Lodhi Garden · Delhi')).not.toBeInTheDocument();
  });

  it('lists every host', () => {
    renderCard({ hosts: [hostFixture(), hostFixture({ user_id: 'u-2', name: 'Ravi Kumar', role: 'CO_HOST' })] });
    expect(screen.getByText('By Asha Rao, Ravi Kumar')).toBeInTheDocument();
  });

  it('leaves out the place and host lines when there is nothing to say', () => {
    renderCard({ venue_name: null, city_name: null, hosts: [] });
    expect(screen.queryByText(/^By /)).not.toBeInTheDocument();
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('flags drafts and cancellations only on a host’s own list', () => {
    const { unmount } = renderCard({ status: 'CANCELLED' });
    expect(screen.queryByTestId('event-status-chip')).not.toBeInTheDocument();
    unmount();

    renderCard({ status: 'CANCELLED' }, { showStatus: true });
    expect(screen.getByTestId('event-status-chip')).toHaveTextContent('Cancelled');
  });

  it('never flags a published event, even on a host list', () => {
    renderCard({ status: 'PUBLISHED' }, { showStatus: true });
    expect(screen.queryByTestId('event-status-chip')).not.toBeInTheDocument();
  });
});
