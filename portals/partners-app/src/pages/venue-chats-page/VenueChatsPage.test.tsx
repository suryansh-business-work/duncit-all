import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import VenueChatsPage from './VenueChatsPage';
import { SELECTED_VENUE_KEY } from '../../components/venue/useSelectedVenue';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const venues = {
  myVenues: [
    { __typename: 'Venue', id: 'v1', venue_name: 'Cafe Mocha' },
    { __typename: 'Venue', id: 'v2', venue_name: 'Arena' },
  ],
};

const thread = (podId: string, over: Record<string, unknown> = {}) => ({
  __typename: 'VenueChatThread',
  pod_id: podId,
  pod_title: `Pod ${podId}`,
  pod_date_time: '2026-12-05T12:30:00.000Z',
  venue_id: 'v1',
  venue_name: 'Cafe Mocha',
  host_name: 'Ravi',
  host_photo: null,
  last_message: 'See you at 7',
  last_message_is_photo: false,
  last_message_at: '2026-12-01T06:10:00.000Z',
  last_message_side: 'HOST',
  unread_count: 0,
  ...over,
});

const page = (rows: unknown[], total = rows.length) => ({
  myVenueChatThreads: { __typename: 'VenueChatThreadPage', rows, total },
});

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<VenueChatsPage />, {
    route: '/venues/chats',
    link: scriptedLink({ MyVenues: venues, ...answers }, sent),
  });

const reads = (sent: SentOperation[]) => sent.filter((op) => op.name === 'MyVenueChatThreads');

describe('VenueChatsPage', () => {
  it('lists every venue’s chats with the venue named on each row, and opens a thread on click', async () => {
    mount({
      MyVenueChatThreads: page([
        thread('p1', { unread_count: 2 }),
        thread('p2', { venue_name: 'Arena', last_message: null, last_message_is_photo: true }),
      ]),
    });
    // Opens on the one venue (no venue name on its rows); "All my venues" widens it and names each row's venue.
    expect(await screen.findByText('Pod p1')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Venue' }));
    fireEvent.click(await screen.findByRole('option', { name: 'All my venues' }));
    const rowOne = await screen.findByText('Pod p1 · Cafe Mocha');
    expect(screen.getByText('Pod p2 · Arena')).toBeTruthy();
    expect(screen.getByText('2 unread')).toBeTruthy();
    expect(screen.getByText(/Ravi · See you at 7/)).toBeTruthy();
    expect(screen.getByText(/Ravi · Photo/)).toBeTruthy();
    fireEvent.click(rowOne);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/venues/pods/p1/chat'));
  });

  it('reads the picked venue’s chats and remembers the pick', async () => {
    const sent: SentOperation[] = [];
    mount({ MyVenueChatThreads: page([thread('p1')]) }, sent);
    await screen.findByText('Pod p1');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Venue' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Arena' }));
    await waitFor(() => expect(reads(sent).some((op) => op.variables.venue_id === 'v2')).toBe(true));
    expect(globalThis.localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v2');
  });

  it('reads every venue when All my venues is chosen, without forgetting the remembered venue', async () => {
    globalThis.localStorage.setItem(SELECTED_VENUE_KEY, 'v1');
    const sent: SentOperation[] = [];
    mount({ MyVenueChatThreads: page([thread('p1')]) }, sent);
    await waitFor(() => expect(reads(sent).some((op) => op.variables.venue_id === 'v1')).toBe(true));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Venue' }));
    fireEvent.click(await screen.findByRole('option', { name: 'All my venues' }));
    await waitFor(() => expect(reads(sent).some((op) => op.variables.venue_id === null)).toBe(true));
    expect(globalThis.localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v1');
  });

  it('says there are no chats yet', async () => {
    mount({ MyVenueChatThreads: page([]) });
    expect(
      await screen.findByText('No chats yet. Conversations with the hosts of pods at your venues show here.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('shows a spinner while the first page loads', async () => {
    mount({ MyVenueChatThreads: STAY_PENDING });
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('says the chats could not be loaded', async () => {
    mount({ MyVenueChatThreads: new Error('boom') });
    expect(await screen.findByText('Could not load your chats.')).toBeTruthy();
  });

  it('appends the next page after the rows already shown', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        MyVenueChatThreads: (variables) =>
          variables.offset === 0 ? page([thread('p1'), thread('p2')], 3) : page([thread('p3')], 3),
      },
      sent,
    );
    await screen.findByText('Pod p1');
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(await screen.findByText('Pod p3')).toBeTruthy();
    expect(screen.getAllByText(/^Pod p[0-9]$/).map((row) => row.textContent)).toEqual(['Pod p1', 'Pod p2', 'Pod p3']);
    expect(reads(sent).at(-1)?.variables.offset).toBe(2);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull());
  });
});
