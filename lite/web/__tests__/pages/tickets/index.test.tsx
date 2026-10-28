import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import { LITE_MY_REGISTRATIONS, type LiteTicket } from '../../../graphql/registrations';
import { TicketsPage } from '../../../pages/tickets';
import { eventCardFixture, meFixture, renderWithProviders } from '../../test-utils';
import { myTicketFixture, ticketEventFixture } from '../ticket/ticket-fixture';

const listMock = (past: boolean, rows: LiteTicket[]): MockedResponse => ({
  request: { query: LITE_MY_REGISTRATIONS, variables: { past } },
  result: { data: { liteMyRegistrations: rows } },
});

const second = myTicketFixture({
  id: 'reg-2',
  code: 'QRS456',
  event: ticketEventFixture({ ...eventCardFixture({ id: 'ev-2', slug: 'rooftop-gig', title: 'Rooftop Gig' }) }),
});

describe('TicketsPage', () => {
  it('asks a signed-out reader to sign in, under the page title', () => {
    renderWithProviders(<TicketsPage />, { route: '/tickets' });

    expect(screen.getByRole('heading', { level: 1, name: 'My tickets' })).toBeInTheDocument();
    expect(screen.getByText('Everything you registered for.')).toBeInTheDocument();
    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to see the events you registered for.');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('lists the reader’s upcoming tickets, each linking to its page', async () => {
    renderWithProviders(<TicketsPage />, { route: '/tickets', me: meFixture(), mocks: [listMock(false, [myTicketFixture(), second])] });

    const list = await screen.findByTestId('tickets-list');
    const rows = within(list).getAllByTestId('ticket-row');
    expect(rows.map((row) => row.getAttribute('href'))).toEqual(['/tickets/reg-1', '/tickets/reg-2']);
    expect(within(list).getByText('Rooftop Gig')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('aria-selected', 'true');
  });

  it('points a reader with no upcoming tickets to Discover', async () => {
    renderWithProviders(<TicketsPage />, { route: '/tickets', me: meFixture(), mocks: [listMock(false, [])] });

    expect(await screen.findByText('No tickets yet')).toBeInTheDocument();
    expect(screen.getByText('Register for an event and it shows up here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discover' })).toHaveAttribute('href', '/discover');
  });

  it('switches to past tickets from the tab strip, keeping the choice in the URL', async () => {
    const { user, router } = renderWithProviders(<TicketsPage />, { route: '/tickets', me: meFixture(), mocks: [listMock(false, [myTicketFixture()]), listMock(true, [])] });
    await screen.findByTestId('tickets-list');

    await user.click(screen.getByRole('tab', { name: 'Past' }));

    expect(await screen.findByText('No past events')).toBeInTheDocument();
    expect(screen.queryByTestId('tickets-discover')).not.toBeInTheDocument();
    expect(screen.queryByText('Register for an event and it shows up here.')).not.toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toContain('selectedtab=past'));
  });

  it('opens on the past tab when the URL asks for it', async () => {
    renderWithProviders(<TicketsPage />, { route: '/tickets?selectedtab=past', me: meFixture(), mocks: [listMock(true, [myTicketFixture()])] });

    expect(await screen.findByTestId('tickets-list')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the API error when the list cannot be read', async () => {
    renderWithProviders(<TicketsPage />, {
      route: '/tickets',
      me: meFixture(),
      mocks: [{ request: { query: LITE_MY_REGISTRATIONS, variables: { past: false } }, result: { errors: [{ message: 'Could not read your tickets' }] } }],
    });

    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Could not read your tickets');
  });
});
