import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingPage } from '../../../pages/landing/LandingPage';
import { discoverErrorMock, discoverFixture, discoverMock } from '../discover/discover-fixtures';
import { cityFixture, eventCardFixture, renderWithProviders } from '../../test-utils';

const COVER_A = 'https://img.example/a.jpg';
const COVER_B = 'https://img.example/b.jpg';
const COVER_C = 'https://img.example/c.jpg';

describe('LandingPage', () => {
  it('floats every distinct real cover around the hero and fills the bands below', async () => {
    const discover = discoverFixture({
      featured_events: [eventCardFixture({ id: 'f1', slug: 'f1', title: 'Major one', cover_url: COVER_A })],
      popular_events: [
        eventCardFixture({ id: 'p1', slug: 'p1', title: 'Popular one', cover_url: COVER_A }),
        eventCardFixture({ id: 'p2', slug: 'p2', title: 'Popular two', cover_url: COVER_B }),
      ],
      upcoming_events: [
        eventCardFixture({ id: 'u1', slug: 'u1', title: 'No cover', cover_url: null }),
        eventCardFixture({ id: 'u2', slug: 'u2', title: 'Upcoming two', cover_url: COVER_C }),
      ],
    });
    renderWithProviders(<LandingPage />, { mocks: [discoverMock(discover)] });

    expect(await screen.findByRole('region', { name: 'Popular events' })).toBeInTheDocument();
    const hero = screen.getByTestId('landing-hero');
    const sources = [...hero.querySelectorAll('img')].map((image) => image.getAttribute('src'));
    expect(sources.slice(0, 3)).toEqual([COVER_A, COVER_B, COVER_C]);
    expect(new Set(sources)).toEqual(new Set([COVER_A, COVER_B, COVER_C]));
    expect(screen.getByRole('region', { name: 'Upcoming major events' })).toBeInTheDocument();
    expect(screen.getByTestId('landing-closing')).toBeInTheDocument();
  });

  it('titles the page for search engines and the tab', async () => {
    renderWithProviders(<LandingPage />, { mocks: [discoverMock(discoverFixture())] });
    await waitFor(() => expect(document.title).toBe('Delightful events start here | Duncit Lite'));
  });

  it('reads Discover for the city in the link and names that city on the popular band', async () => {
    const discover = discoverFixture({
      cities: [cityFixture({ slug: 'delhi', name: 'Delhi' })],
      popular_events: [eventCardFixture()],
    });
    renderWithProviders(<LandingPage />, { route: '/?city=delhi', mocks: [discoverMock(discover, 'delhi')] });
    expect(await screen.findByRole('region', { name: 'Popular events in Delhi' })).toBeInTheDocument();
  });

  it('says so when Discover cannot be read, and still offers the hero and closing call', async () => {
    renderWithProviders(<LandingPage />, { mocks: [discoverErrorMock('Discover is resting')] });
    const alert = await screen.findByTestId('landing-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('Discover is resting');
    expect(within(screen.getByTestId('landing-page')).getByTestId('landing-hero')).toBeInTheDocument();
    expect(screen.getByTestId('landing-closing')).toBeInTheDocument();
  });
});
