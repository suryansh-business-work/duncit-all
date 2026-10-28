import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscoverSections } from '../../../pages/discover/DiscoverSections';
import { discoverFixture } from './discover-fixtures';
import { calendarFixture, categoryFixture, cityFixture, eventCardFixture, renderWithProviders } from '../../test-utils';

describe('DiscoverSections', () => {
  it('says nothing is here yet when every band is empty', () => {
    renderWithProviders(<DiscoverSections discover={discoverFixture()} cityName={null} citySlug={null} />);
    const empty = screen.getByTestId('empty-state');
    expect(empty).toHaveTextContent('Nothing here yet');
    expect(empty).toHaveTextContent('Events, calendars and cities will show up here as hosts add them.');
  });

  it('counts only the bands it draws: featured or upcoming events alone still read as empty', () => {
    const discover = discoverFixture({ featured_events: [eventCardFixture()], upcoming_events: [eventCardFixture({ id: 'ev-2' })] });
    renderWithProviders(<DiscoverSections discover={discover} cityName={null} citySlug={null} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('lists popular events everywhere, with View all leading to search', () => {
    renderWithProviders(<DiscoverSections discover={discoverFixture({ popular_events: [eventCardFixture()] })} cityName={null} citySlug={null} />);
    const band = screen.getByRole('region', { name: 'Popular events' });
    expect(within(band).getByText('Everywhere')).toBeInTheDocument();
    expect(within(band).getByTestId('event-row')).toHaveAttribute('href', '/e/garden-party');
    expect(within(band).getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/search?q=');
    expect(screen.queryByRole('region', { name: 'Browse by category' })).not.toBeInTheDocument();
  });

  it('narrows popular events to the picked city, with View all leading to the city page', () => {
    renderWithProviders(<DiscoverSections discover={discoverFixture({ popular_events: [eventCardFixture()] })} cityName="Delhi" citySlug="delhi" />);
    const band = screen.getByRole('region', { name: 'Popular events' });
    expect(within(band).getByText('Delhi')).toBeInTheDocument();
    expect(within(band).getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/delhi');
  });

  it('draws categories with counts, followable calendars and cities by region', () => {
    const discover = discoverFixture({
      categories: [categoryFixture({ events_count: 2 })],
      featured_calendars: [calendarFixture()],
      cities: [cityFixture()],
    });
    renderWithProviders(<DiscoverSections discover={discover} cityName={null} citySlug={null} />);
    expect(within(screen.getByRole('region', { name: 'Browse by category' })).getByText('2 events')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Featured calendars' })).getByRole('button', { name: 'Follow Run Club' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Explore local events' })).getByTestId('city-delhi')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Popular events' })).not.toBeInTheDocument();
  });
});
