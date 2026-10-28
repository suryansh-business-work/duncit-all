import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import type { LiteEventCard } from '../../../../shared/graphql/documents';
import { LITE_CATEGORIES, LITE_CITY } from '../../../graphql/discover';
import { LITE_EVENTS } from '../../../graphql/events';
import type { LiteEventFilterVars } from '../../../graphql/types';
import { CategoryPage, CityPage, SearchPage } from '../../../pages/lists';
import { categoryFixture, cityFixture, eventCardFixture, renderWithProviders, typed } from '../../test-utils';

const eventsMock = (filter: LiteEventFilterVars, rows: LiteEventCard[]): MockedResponse => ({
  request: { query: LITE_EVENTS, variables: { filter, page: 1, page_size: 18 } },
  result: { data: { liteEvents: typed('LiteEventPage', { rows, total: rows.length, page: 1, page_size: 18 }) } },
});

const cityMock = (slug: string, city: ReturnType<typeof cityFixture> | null): MockedResponse => ({
  request: { query: LITE_CITY, variables: { slug } },
  result: { data: { liteCity: city } },
});

const categoriesMock: MockedResponse = {
  request: { query: LITE_CATEGORIES },
  result: { data: { liteCategories: [categoryFixture({ name: 'Music', slug: 'music', events_count: 1 })] } },
};

describe('CityPage', () => {
  const delhi = cityFixture({ slug: 'delhi', name: 'Delhi', events_count: 3 });

  it('lists the city’s upcoming events under its name and count', async () => {
    renderWithProviders(<CityPage />, { path: '/:citySlug', route: '/delhi', mocks: [cityMock('delhi', delhi), eventsMock({ city_slug: 'delhi' }, [eventCardFixture()])] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Events in Delhi' })).toBeInTheDocument();
    expect(screen.getByText('3 upcoming events')).toBeInTheDocument();
    expect(await screen.findByTestId('event-card')).toHaveTextContent('Garden Party');
    await waitFor(() => expect(document.title).toBe('Events in Delhi | Duncit Lite'));
  });

  it('says nothing is coming up in the city when it has no events', async () => {
    renderWithProviders(<CityPage />, { path: '/:citySlug', route: '/delhi', mocks: [cityMock('delhi', delhi), eventsMock({ city_slug: 'delhi' }, [])] });
    const empty = await screen.findByTestId('empty-state');
    expect(empty).toHaveTextContent('Nothing coming up in Delhi');
    expect(empty).toHaveTextContent('Check back soon, or host something yourself.');
  });

  it('keeps a search started on the city page inside that city', async () => {
    const { user, router } = renderWithProviders(<CityPage />, {
      path: '/:citySlug',
      route: '/delhi',
      routes: [{ path: '/search', element: <p>Search results</p> }],
      mocks: [cityMock('delhi', delhi), eventsMock({ city_slug: 'delhi' }, [])],
    });
    await user.type(await screen.findByRole('searchbox', { name: 'Search events' }), 'jazz night');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'));
    expect(router.state.location.search).toBe('?q=jazz%20night&city=delhi');
  });

  it('answers not found for a city the API does not know', async () => {
    renderWithProviders(<CityPage />, { path: '/:citySlug', route: '/atlantis', mocks: [cityMock('atlantis', null)] });
    expect(await screen.findByTestId('not-found')).toHaveTextContent('We could not find that');
  });
});

describe('CategoryPage', () => {
  it('lists the category’s events under its name and count', async () => {
    renderWithProviders(<CategoryPage />, {
      path: '/category/:slug',
      route: '/category/music',
      mocks: [categoriesMock, eventsMock({ category_slug: 'music' }, [eventCardFixture()])],
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Music' })).toBeInTheDocument();
    expect(screen.getByText('1 upcoming event')).toBeInTheDocument();
    expect(await screen.findByTestId('event-card')).toBeInTheDocument();
  });

  it('says nothing is coming up in the category when it is empty', async () => {
    renderWithProviders(<CategoryPage />, { path: '/category/:slug', route: '/category/music', mocks: [categoriesMock, eventsMock({ category_slug: 'music' }, [])] });
    expect(await screen.findByTestId('empty-state')).toHaveTextContent('Nothing coming up in Music');
  });

  it('answers not found for a slug that is not a category', async () => {
    renderWithProviders(<CategoryPage />, { path: '/category/:slug', route: '/category/knitting', mocks: [categoriesMock] });
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
  });
});

describe('SearchPage', () => {
  it('shows the results for the query in the link, with the query kept in the box', async () => {
    renderWithProviders(<SearchPage />, { route: '/search?q=jazz', mocks: [eventsMock({ search: 'jazz', city_slug: null }, [eventCardFixture({ title: 'Jazz Night' })])] });
    expect(screen.getByRole('heading', { level: 1, name: 'Results for “jazz”' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search events' })).toHaveValue('jazz');
    expect(await screen.findByText('Jazz Night')).toBeInTheDocument();
  });

  it('searches within a city when the link names one', async () => {
    renderWithProviders(<SearchPage />, { route: '/search?q=jazz&city=delhi', mocks: [eventsMock({ search: 'jazz', city_slug: 'delhi' }, [])] });
    const empty = await screen.findByTestId('empty-state');
    expect(empty).toHaveTextContent('No events match');
    expect(empty).toHaveTextContent('Try a different word, or browse by city or category.');
  });

  it('is titled plainly and searches everything for a blank query', async () => {
    renderWithProviders(<SearchPage />, { route: '/search?q=%20%20', mocks: [eventsMock({ search: null, city_slug: null }, [eventCardFixture()])] });
    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(await screen.findByTestId('event-card')).toBeInTheDocument();
    expect(within(screen.getByRole('search')).getByRole('searchbox')).toHaveValue('');
  });
});
