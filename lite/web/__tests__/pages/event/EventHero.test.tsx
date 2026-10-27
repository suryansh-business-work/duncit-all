import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventHero } from '../../../pages/event/EventHero';
import { categoryFixture, eventFixture, renderWithProviders } from '../../test-utils';

describe('EventHero', () => {
  it('titles the page with the event, its city and a Share action', () => {
    renderWithProviders(<EventHero event={eventFixture()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Garden Party' })).toBeInTheDocument();
    expect(within(screen.getByTestId('event-hero')).getByText('Delhi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByTestId('event-cover')).toHaveAttribute('alt', '');
  });

  it('shows the category and the visibility, and no status chip once published', () => {
    renderWithProviders(<EventHero event={eventFixture({ category: categoryFixture({ name: 'Music' }), visibility: 'UNLISTED' })} />);

    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Unlisted')).toBeInTheDocument();
    expect(screen.queryByTestId('event-status-chip')).not.toBeInTheDocument();
  });

  it.each([
    ['DRAFT', 'Draft'],
    ['CANCELLED', 'Cancelled'],
  ] as const)('flags a %s event with its status', (status, label) => {
    renderWithProviders(<EventHero event={eventFixture({ status })} />);
    expect(screen.getByTestId('event-status-chip')).toHaveTextContent(label);
  });

  it('leaves the subtitle out for an event with no city', () => {
    renderWithProviders(<EventHero event={eventFixture({ city_name: null, category: null })} />);
    expect(within(screen.getByTestId('event-hero')).queryByText('Delhi')).not.toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });
});
