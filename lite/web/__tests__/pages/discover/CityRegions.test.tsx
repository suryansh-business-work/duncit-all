import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CityRegions, REGION_ORDER } from '../../../pages/discover/CityRegions';
import { cityFixture, renderWithProviders } from '../../test-utils';

const delhi = cityFixture({ id: 'c-del', name: 'Delhi', slug: 'delhi', region: 'ASIA_PACIFIC', events_count: 3 });
const mumbai = cityFixture({ id: 'c-bom', name: 'Mumbai', slug: 'mumbai', region: 'ASIA_PACIFIC', events_count: 1 });
const berlin = cityFixture({ id: 'c-ber', name: 'Berlin', slug: 'berlin', region: 'EUROPE', events_count: 7 });
const lagos = cityFixture({ id: 'c-los', name: 'Lagos', slug: 'lagos', region: 'AFRICA', events_count: 2 });

const shownCities = () => within(screen.getByRole('tabpanel')).getAllByRole('link').map((link) => link.textContent);

describe('CityRegions', () => {
  it('orders the regions Asia & Pacific, Europe, Africa, North America, South America', () => {
    expect(REGION_ORDER).toEqual(['ASIA_PACIFIC', 'EUROPE', 'AFRICA', 'NORTH_AMERICA', 'SOUTH_AMERICA']);
  });

  it('offers a tab only for the regions that have a city, in region order', () => {
    renderWithProviders(<CityRegions cities={[lagos, berlin, delhi]} />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Asia & Pacific', 'Europe', 'Africa']);
  });

  it('opens on the first region and lists its cities with their event counts and links', () => {
    renderWithProviders(<CityRegions cities={[berlin, delhi, mumbai]} />);
    expect(screen.getByRole('tab', { name: 'Asia & Pacific' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: 'Asia & Pacific' });
    expect(within(panel).getByTestId('city-delhi')).toHaveAttribute('href', '/delhi');
    expect(within(panel).getByText('3 events')).toBeInTheDocument();
    expect(within(panel).getByText('1 event')).toBeInTheDocument();
    expect(within(panel).queryByText('Berlin')).not.toBeInTheDocument();
  });

  it('switches region on a tab and keeps the choice in the URL', async () => {
    const { user, router } = renderWithProviders(<CityRegions cities={[delhi, berlin]} />);
    await user.click(screen.getByRole('tab', { name: 'Europe' }));
    expect(router.state.location.search).toBe('?region=EUROPE');
    expect(screen.getByRole('tab', { name: 'Europe' })).toHaveAttribute('aria-selected', 'true');
    expect(shownCities()).toEqual([expect.stringContaining('Berlin')]);
  });

  it('opens on the region a link names', () => {
    renderWithProviders(<CityRegions cities={[delhi, lagos]} />, { route: '/?region=AFRICA' });
    expect(shownCities()).toEqual([expect.stringContaining('Lagos')]);
  });

  it('ignores a region the strip does not offer and falls back to the first one', () => {
    renderWithProviders(<CityRegions cities={[delhi, lagos]} />, { route: '/?region=EUROPE' });
    expect(screen.getByRole('tab', { name: 'Asia & Pacific' })).toHaveAttribute('aria-selected', 'true');
    expect(shownCities()).toEqual([expect.stringContaining('Delhi')]);
  });

  it('drops the tab strip when every city is in one region', () => {
    renderWithProviders(<CityRegions cities={[delhi, mumbai]} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(shownCities()).toHaveLength(2);
  });

  it('renders nothing without cities', () => {
    renderWithProviders(<CityRegions cities={[]} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
