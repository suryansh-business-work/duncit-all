import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import { LITE_SUBSCRIBE_CALENDAR } from '../../../graphql/calendars';
import { DiscoverPage } from '../../../pages/discover';
import { discoverErrorMock, discoverFixture, discoverMock } from './discover-fixtures';
import { calendarFixture, cityFixture, eventCardFixture, meFixture, renderWithProviders } from '../../test-utils';

const delhi = cityFixture({ slug: 'delhi', name: 'Delhi' });

describe('DiscoverPage', () => {
  it('introduces the page, offers search, and draws what Discover holds', async () => {
    renderWithProviders(<DiscoverPage />, { mocks: [discoverMock(discoverFixture({ popular_events: [eventCardFixture()], cities: [delhi] }))] });
    expect(screen.getByRole('heading', { level: 1, name: 'Discover events' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Popular events' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Discover events | Duncit Lite'));
  });

  it('shows the API’s message when Discover cannot be read', async () => {
    renderWithProviders(<DiscoverPage />, { mocks: [discoverErrorMock('Discover is resting')] });
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Discover is resting');
  });

  it('narrows Discover to the city picked, keeping it in the URL', async () => {
    const everywhere = discoverFixture({ popular_events: [eventCardFixture()], cities: [delhi] });
    const inDelhi = discoverFixture({ popular_events: [eventCardFixture({ id: 'ev-9', slug: 'delhi-walk', title: 'Delhi Walk' })], cities: [delhi] });
    const { user, router } = renderWithProviders(<DiscoverPage />, { mocks: [discoverMock(everywhere), discoverMock(inDelhi, 'delhi')] });
    await screen.findByRole('region', { name: 'Popular events' });

    await user.click(screen.getByRole('combobox', { name: 'City' }));
    await user.click(screen.getByRole('option', { name: 'Delhi' }));

    expect(router.state.location.search).toBe('?city=delhi');
    expect(await screen.findByText('Delhi Walk')).toBeInTheDocument();
    const band = screen.getByRole('region', { name: 'Popular events' });
    expect(within(band).getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/delhi');
  });

  it('opens on the city in the link, and clears it when Everywhere is picked', async () => {
    const inDelhi = discoverFixture({ popular_events: [eventCardFixture()], cities: [delhi] });
    const { user, router } = renderWithProviders(<DiscoverPage />, {
      route: '/discover?city=delhi',
      mocks: [discoverMock(inDelhi, 'delhi'), discoverMock(discoverFixture({ cities: [delhi] }))],
    });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'City' })).toHaveTextContent('Delhi'));
    await screen.findByRole('region', { name: 'Popular events' });

    await user.click(screen.getByRole('combobox', { name: 'City' }));
    await user.click(screen.getByRole('option', { name: 'Everywhere' }));
    expect(router.state.location.search).toBe('');
  });

  it('flips a featured calendar to Following once the follow is saved', async () => {
    const follow: MockedResponse = {
      request: { query: LITE_SUBSCRIBE_CALENDAR, variables: { id: 'cal-1' } },
      result: { data: { liteSubscribeCalendar: calendarFixture({ viewer_subscribed: true, subscriber_count: 1 }) } },
    };
    const { user } = renderWithProviders(<DiscoverPage />, {
      me: meFixture(),
      mocks: [discoverMock(discoverFixture({ featured_calendars: [calendarFixture()] })), follow],
    });
    await user.click(await screen.findByRole('button', { name: 'Follow Run Club', pressed: false }));
    expect(await screen.findByRole('button', { name: 'Following Run Club', pressed: true })).toBeInTheDocument();
  });
});
