import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { LITE_EVENT, LITE_PUBLISH_EVENT, LITE_TRACK_EVENT_VIEW } from '../../../graphql/events';
import { EventPage } from '../../../pages/event';
import { eventFixture, meFixture, renderWithProviders, statsFixture } from '../../test-utils';

const DAY_MS = 86_400_000;
const upcoming = (over: Partial<LiteEvent> = {}): LiteEvent =>
  eventFixture({ start_at: new Date(Date.now() + 7 * DAY_MS).toISOString(), end_at: new Date(Date.now() + 7 * DAY_MS + 3_600_000).toISOString(), ...over });

const eventMock = (liteEvent: LiteEvent | null): MockedResponse => ({ request: { query: LITE_EVENT, variables: { slug: 'garden-party' } }, result: { data: { liteEvent } } });
const trackMock: MockedResponse = {
  request: { query: LITE_TRACK_EVENT_VIEW, variables: { slug: 'garden-party' } },
  result: { data: { liteTrackEventView: true } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const renderPage = (mocks: MockedResponse[], signedIn = false) =>
  renderWithProviders(<EventPage />, { route: '/e/garden-party', path: '/e/:slug', mocks: [...mocks, trackMock], me: signedIn ? meFixture() : null });

describe('EventPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows a loader while the event is on its way', () => {
    renderPage([eventMock(upcoming())]);
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
  });

  it('lays out the event: hero, when, where, who is going, hosts, description and the registration card', async () => {
    renderPage([eventMock(upcoming({ stats: statsFixture({ going: 2 }) }))]);

    expect(await screen.findByTestId('event-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Garden Party' })).toBeInTheDocument();
    expect(screen.getByTestId('event-when')).toBeInTheDocument();
    expect(within(screen.getByTestId('event-where')).getByRole('heading', { name: 'Lodhi Garden' })).toBeInTheDocument();
    expect(screen.getByText('2 people going')).toBeInTheDocument();
    expect(within(screen.getByTestId('event-hosts')).getByRole('link', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('Bring a picnic blanket.')).toBeInTheDocument();
    expect(screen.getByTestId('register-open')).toBeInTheDocument();
    expect(screen.getByTestId('event-theme-backdrop')).toHaveAttribute('data-theme-key', 'MINIMAL');
    expect(screen.queryByTestId('host-bar')).not.toBeInTheDocument();
  });

  it('titles the browser tab with the event and the site', async () => {
    renderPage([eventMock(upcoming())]);
    await screen.findByTestId('event-page');
    await waitFor(() => expect(document.title).toBe('Garden Party | Duncit Lite'));
  });

  it('shows the not-found page for a slug the API does not know', async () => {
    renderPage([eventMock(null)]);
    expect(await screen.findByTestId('not-found')).toHaveTextContent('We could not find that');
    expect(screen.queryByTestId('event-page')).not.toBeInTheDocument();
  });

  it('shows the API error when the event cannot be read', async () => {
    renderPage([{ request: { query: LITE_EVENT, variables: { slug: 'garden-party' } }, result: { errors: [{ message: 'Something broke on our side' }] } }]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Something broke on our side');
  });

  it('tells every reader a cancelled event was cancelled, with the host’s reason', async () => {
    renderPage([eventMock(upcoming({ status: 'CANCELLED', cancel_reason: 'Heavy rain' }))]);

    const banner = await screen.findByTestId('event-cancelled');
    expect(banner).toHaveTextContent('This event was cancelled by the host. Reason: Heavy rain');
  });

  it('leaves the reason out when the host gave none', async () => {
    renderPage([eventMock(upcoming({ status: 'CANCELLED', cancel_reason: null }))]);

    const banner = await screen.findByTestId('event-cancelled');
    expect(banner).toHaveTextContent(/^This event was cancelled by the host\.$/);
  });

  it('counts a visitor’s view but never the host’s', async () => {
    const answer = vi.fn(() => ({ data: { liteTrackEventView: true } }));
    const counted: MockedResponse = { request: { query: LITE_TRACK_EVENT_VIEW, variables: { slug: 'garden-party' } }, result: answer, maxUsageCount: Number.POSITIVE_INFINITY };

    const { unmount } = renderWithProviders(<EventPage />, { route: '/e/garden-party', path: '/e/:slug', mocks: [eventMock(upcoming({ viewer_is_host: true })), counted], me: meFixture() });
    await screen.findByTestId('host-bar');
    expect(answer).not.toHaveBeenCalled();
    unmount();

    renderWithProviders(<EventPage />, { route: '/e/garden-party', path: '/e/:slug', mocks: [eventMock(upcoming()), counted] });
    await screen.findByTestId('event-page');
    await waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
  });

  it('lets the host publish a draft and re-reads the page', async () => {
    const draft = upcoming({ status: 'DRAFT', viewer_is_host: true });
    const live = { ...draft, status: 'PUBLISHED' as const, published_at: '2026-10-27T00:00:00.000Z' };
    const { user } = renderPage(
      [eventMock(draft), { request: { query: LITE_PUBLISH_EVENT, variables: { id: 'ev-1' } }, result: { data: { litePublishEvent: live } } }, eventMock(live)],
      true,
    );

    expect(await screen.findByText('This is a draft. Publish it when you are ready for guests.')).toBeInTheDocument();
    expect(screen.getByTestId('registration-closed')).toHaveTextContent('This event is not published yet. Only you can see it.');

    await user.click(screen.getByTestId('host-publish'));
    await user.click(await screen.findByTestId('confirm-dialog-confirm'));

    expect(await screen.findByText('You are hosting this event.')).toBeInTheDocument();
    expect(screen.queryByTestId('host-publish')).not.toBeInTheDocument();
    expect(screen.getByTestId('register-open')).toBeInTheDocument();
  });
});
