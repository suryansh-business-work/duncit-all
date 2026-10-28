import type { MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { LITE_EVENT, LITE_SET_REGISTRATION_OPEN } from '../../../graphql/events';
import { ManagePage } from '../../../pages/manage';
import { calendarFixture, meFixture, renderWithProviders } from '../../test-utils';
import { apiRefusal, hostedEvent, registrationsMock } from './manage-mocks';

const me = meFixture();
const eventMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_EVENT, variables: { slug: 'garden-party' } }, result });
const found = (event: LiteEvent | null) => eventMock({ data: { liteEvent: event } });

const renderPage = (mocks: MockedResponse[], { route = '/e/garden-party/manage', signedIn = true } = {}) =>
  renderWithProviders(<ManagePage />, {
    me: signedIn ? me : null,
    mocks,
    path: '/e/:slug/manage',
    route,
    routes: [{ path: '/e/:slug', element: <p data-testid="event-page">event page</p> }],
  });

describe('ManagePage', () => {
  it('asks a signed-out reader to sign in first', () => {
    renderPage([], { signedIn: false });

    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to see the events you host and attend.');
    expect(screen.queryByTestId('manage-page')).not.toBeInTheDocument();
  });

  it('opens on Overview for a host, with the title, the calendar and a link to the page', async () => {
    renderPage([found(hostedEvent())]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Garden Party' })).toBeInTheDocument();
    expect(screen.getByText('Personal calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('event-status-chip')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Event page' })).toHaveAttribute('href', '/e/garden-party');
    expect(
      within(screen.getByRole('tablist'))
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Overview', 'Guests', 'Registration', 'Blasts', 'Insights', 'More']);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toContainElement(screen.getByTestId('manage-overview'));
    expect(document.title).toBe('Manage · Garden Party | Duncit Lite');
  });

  it('names the calendar and marks a draft', async () => {
    renderPage([found(hostedEvent({ status: 'DRAFT', calendar: calendarFixture() }))]);

    expect(await screen.findByText('Run Club')).toBeInTheDocument();
    expect(screen.getByTestId('event-status-chip')).toHaveTextContent('Draft');
  });

  it('switches tabs and keeps the choice in the URL', async () => {
    const { user, router } = renderPage([found(hostedEvent())]);

    await user.click(await screen.findByRole('tab', { name: 'Registration' }));

    expect(screen.getByRole('tabpanel', { name: 'Registration' })).toContainElement(screen.getByTestId('manage-registration'));
    expect(new URLSearchParams(router.state.location.search).get('selectedtab')).toBe('registration');
  });

  it.each([
    ['blasts', 'update-form'],
    ['more', 'manage-settings'],
  ])('opens the %s tab straight from the URL', async (tab, testId) => {
    renderPage([found(hostedEvent())], { route: `/e/garden-party/manage?selectedtab=${tab}` });

    expect(await screen.findByTestId(testId)).toBeInTheDocument();
  });

  it('puts the scanner link, the guest list and check-in together on Guests', async () => {
    const { user } = renderPage([found(hostedEvent()), registrationsMock({}, []), registrationsMock({ status: 'CONFIRMED' }, [])]);

    await user.click(await screen.findByRole('button', { name: 'Guests' }));

    const panel = screen.getByRole('tabpanel', { name: 'Guests' });
    expect(within(panel).getByTestId('scanner-link-card')).toBeInTheDocument();
    expect(within(panel).getByTestId('manage-guests')).toBeInTheDocument();
    expect(within(panel).getByTestId('manage-checkin')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Guests' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reloads the event after a change made on a tab', async () => {
    const reloaded = hostedEvent({ title: 'Garden Party (closed)', registration_open: false });
    const { user } = renderPage(
      [
        found(hostedEvent()),
        { request: { query: LITE_SET_REGISTRATION_OPEN, variables: { id: 'ev-1', open: false } }, result: { data: { liteSetRegistrationOpen: hostedEvent({ registration_open: false }) } } },
        found(reloaded),
      ],
      { route: '/e/garden-party/manage?selectedtab=registration' },
    );

    await user.click(await screen.findByTestId('registration-open'));

    expect(await screen.findByRole('heading', { level: 1, name: 'Garden Party (closed)' })).toBeInTheDocument();
    expect(screen.getByTestId('registration-open')).not.toBeChecked();
  });

  it('sends a reader who is not a host back to the event page', async () => {
    const { router } = renderPage([found(hostedEvent({ viewer_is_host: false }))]);

    expect(await screen.findByTestId('event-page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/e/garden-party');
  });

  it('shows the not-found page for an event that does not exist', async () => {
    renderPage([found(null)]);

    expect(await screen.findByText('We could not find that')).toBeInTheDocument();
    expect(screen.queryByTestId('manage-page')).not.toBeInTheDocument();
  });

  it('shows why the event could not load', async () => {
    renderPage([eventMock(apiRefusal('Something broke on our side'))]);

    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Something broke on our side');
  });

  it('logs, rather than surfaces, a reload that fails after a change', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { user } = renderPage(
      [
        found(hostedEvent()),
        { request: { query: LITE_SET_REGISTRATION_OPEN, variables: { id: 'ev-1', open: false } }, result: { data: { liteSetRegistrationOpen: hostedEvent({ registration_open: false }) } } },
        eventMock(apiRefusal('Try again later')),
      ],
      { route: '/e/garden-party/manage?selectedtab=registration' },
    );

    await user.click(await screen.findByTestId('registration-open'));

    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('[lite] manage refresh failed', expect.anything()));
    warn.mockRestore();
  });
});
