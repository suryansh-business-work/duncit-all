import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingSections } from '../../../pages/landing/LandingSections';
import { discoverFixture } from '../discover/discover-fixtures';
import { calendarFixture, categoryFixture, eventCardFixture, renderWithProviders } from '../../test-utils';

const events = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => eventCardFixture({ id: `${prefix}-${index}`, slug: `${prefix}-${index}`, title: `${prefix} ${index}` }));

describe('LandingSections', () => {
  it('renders no band at all when Discover has nothing', () => {
    renderWithProviders(<LandingSections discover={discoverFixture()} cityName={null} />);
    for (const id of ['landing-popular', 'landing-major', 'landing-communities', 'landing-categories']) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }
  });

  it('shows at most five popular events, titled for the picked city', () => {
    renderWithProviders(<LandingSections discover={discoverFixture({ popular_events: events(6, 'Popular') })} cityName="Delhi" />);
    const band = screen.getByRole('region', { name: 'Popular events in Delhi' });
    expect(within(band).getAllByTestId('event-tile')).toHaveLength(5);
    expect(within(band).queryByText('Popular 5')).not.toBeInTheDocument();
    expect(screen.queryByTestId('landing-major')).not.toBeInTheDocument();
  });

  it('titles the popular band plainly when no city is picked', () => {
    renderWithProviders(<LandingSections discover={discoverFixture({ popular_events: events(1, 'Popular') })} cityName={null} />);
    expect(screen.getByRole('region', { name: 'Popular events' })).toBeInTheDocument();
  });

  it('lists up to eight major events as pills linking to their pages', () => {
    renderWithProviders(<LandingSections discover={discoverFixture({ featured_events: events(9, 'Major') })} cityName={null} />);
    const band = screen.getByRole('region', { name: 'Upcoming major events' });
    const pills = within(band).getAllByTestId('event-pill');
    expect(pills).toHaveLength(8);
    expect(within(pills[0]).getByRole('link')).toHaveAttribute('href', '/e/Major-0');
  });

  it('shows communities without a Follow button, and categories without counts', () => {
    renderWithProviders(
      <LandingSections
        discover={discoverFixture({ featured_calendars: [calendarFixture()], categories: [categoryFixture({ events_count: 4 })] })}
        cityName={null}
      />,
    );
    const communities = screen.getByRole('region', { name: 'Explore communities' });
    expect(within(communities).getByText('Run Club')).toBeInTheDocument();
    expect(within(communities).queryByTestId('calendar-follow')).not.toBeInTheDocument();

    const categories = screen.getByRole('region', { name: 'Browse by category' });
    expect(within(categories).getByText('Music')).toBeInTheDocument();
    expect(within(categories).queryByText('4 events')).not.toBeInTheDocument();
  });
});
