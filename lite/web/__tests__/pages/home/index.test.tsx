import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import type { LiteEventCard } from '../../../../shared/graphql/documents';
import { LITE_MY_EVENTS } from '../../../graphql/events';
import { EventsHomePage } from '../../../pages/home';
import { eventCardFixture, meFixture, renderWithProviders } from '../../test-utils';

const myEvents = (scope: 'HOSTING' | 'ATTENDING', past: boolean, rows: LiteEventCard[] = []): MockedResponse => ({
  request: { query: LITE_MY_EVENTS, variables: { scope, past } },
  result: { data: { liteMyEvents: rows } },
});

const signedIn = (mocks: MockedResponse[], route = '/home') => renderWithProviders(<EventsHomePage />, { me: meFixture(), route, mocks });

describe('EventsHomePage', () => {
  it('asks a visitor to sign in to see their events', () => {
    renderWithProviders(<EventsHomePage />, { route: '/home' });
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
    const gate = screen.getByTestId('signed-in-gate');
    expect(gate).toHaveTextContent('Sign in to see the events you host and attend.');
    expect(within(gate).getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
  });

  it('titles the browser tab', async () => {
    renderWithProviders(<EventsHomePage />, { route: '/home' });
    await waitFor(() => expect(document.title).toBe('Events | Duncit Lite'));
  });

  it('offers Upcoming and Past, opening on Upcoming', () => {
    signedIn([myEvents('HOSTING', false), myEvents('ATTENDING', false)]);
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'false');
  });

  it('invites a reader with nothing coming up to host something', async () => {
    signedIn([myEvents('HOSTING', false), myEvents('ATTENDING', false)]);
    const empty = await screen.findByTestId('home-empty');
    expect(empty).toHaveTextContent('No upcoming events');
    expect(empty).toHaveTextContent('You have no upcoming events. Why not host one?');
    expect(within(empty).getByRole('link', { name: 'Create event' })).toHaveAttribute('href', '/create');
  });

  it('shows the past period from the Past tab, with its own empty copy', async () => {
    const { user, router } = signedIn([myEvents('HOSTING', false), myEvents('ATTENDING', false), myEvents('HOSTING', true), myEvents('ATTENDING', true)]);
    await screen.findByTestId('home-empty');
    await user.click(screen.getByRole('tab', { name: 'Past' }));
    expect(router.state.location.search).toContain('selectedtab=past');
    await waitFor(() => expect(screen.getByTestId('home-empty')).toHaveTextContent('No past events'));
    expect(screen.getByTestId('home-empty')).toHaveTextContent('Events you hosted or went to will be kept here.');
  });

  it('lays the reader’s events out on the timeline', async () => {
    signedIn([myEvents('HOSTING', false, [eventCardFixture({ viewer_is_host: true })]), myEvents('ATTENDING', false)]);
    const timeline = await screen.findByTestId('timeline');
    expect(within(timeline).getByRole('heading', { level: 3, name: 'Garden Party' })).toBeInTheDocument();
    expect(within(timeline).getByRole('link', { name: 'Manage event' })).toBeInTheDocument();
    expect(screen.queryByTestId('home-empty')).not.toBeInTheDocument();
  });

  it('shows the API’s message when the events cannot be read', async () => {
    const refused: MockedResponse = { request: { query: LITE_MY_EVENTS, variables: { scope: 'HOSTING', past: false } }, result: { errors: [{ message: 'Session expired' }] } };
    signedIn([refused, myEvents('ATTENDING', false)]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Session expired');
  });
});
