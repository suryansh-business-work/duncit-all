import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { VENUE_CHAT_PAGE, VENUE_CHAT_THREADS_PAGE } from '@duncit/utils';
import { renderWithProviders } from '../../../../../__tests__/testkit';
import { ADMIN_VENUE_CHAT_MESSAGES, ADMIN_VENUE_CHAT_THREADS } from '../queries';
import VenueChatsTab from '../VenueChatsTab';

const row = (podId: string, over: Record<string, unknown> = {}) => ({
  __typename: 'VenueChatThread',
  pod_id: podId,
  pod_title: `Pod ${podId}`,
  pod_date_time: null,
  venue_id: 'venue-1',
  venue_name: 'The Board Room Cafe',
  host_name: 'Asha',
  host_photo: null,
  last_message: 'Is the terrace free?',
  last_message_is_photo: false,
  last_message_at: null,
  last_message_side: null,
  unread_count: 0,
  ...over,
});

const threadsMock = (rows: object[], total: number, offset = 0): MockedResponse => ({
  request: { query: ADMIN_VENUE_CHAT_THREADS, variables: { venue_id: 'venue-1', limit: VENUE_CHAT_THREADS_PAGE, offset } },
  result: { data: { adminVenueChatThreads: { __typename: 'VenueChatThreadPage', rows, total } } },
});

const messagesMock = (podId: string): MockedResponse => ({
  request: { query: ADMIN_VENUE_CHAT_MESSAGES, variables: { pod_id: podId, limit: VENUE_CHAT_PAGE } },
  result: { data: { adminVenueChatMessages: [] } },
});

const mount = (mocks: MockedResponse[]) => renderWithProviders(<VenueChatsTab venueId="venue-1" />, { mocks });

afterEach(() => vi.restoreAllMocks());

describe('VenueChatsTab', () => {
  it('shows a spinner while the first page loads, then the venue’s chats', async () => {
    mount([threadsMock([row('p1', { unread_count: 2 })], 1)]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('Pod p1')).toBeInTheDocument();
    expect(screen.getByText('Asha · Is the terrace free?')).toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    // One page covers the total: nothing more to load.
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('says so when the venue has no chats', async () => {
    mount([threadsMock([], 0)]);
    expect(await screen.findByText('This venue has no chats yet.')).toBeInTheDocument();
  });

  it('says the chats could not be loaded when the first page fails', async () => {
    mount([
      {
        request: { query: ADMIN_VENUE_CHAT_THREADS, variables: { venue_id: 'venue-1', limit: VENUE_CHAT_THREADS_PAGE, offset: 0 } },
        error: new Error('network down'),
      },
    ]);
    expect(await screen.findByRole('alert')).toHaveTextContent("Could not load this venue's chats.");
    expect(screen.queryByText('Pod p1')).not.toBeInTheDocument();
  });

  it('appends the next page after the rows already shown, until the total is reached', async () => {
    mount([threadsMock([row('p1')], 2), threadsMock([row('p2')], 2, 1)]);
    expect(await screen.findByText('Pod p1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(await screen.findByText('Pod p2')).toBeInTheDocument();
    expect(screen.getByText('Pod p1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('logs a failed "show more" and keeps the rows it already has', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mount([
      threadsMock([row('p1')], 2),
      {
        request: { query: ADMIN_VENUE_CHAT_THREADS, variables: { venue_id: 'venue-1', limit: VENUE_CHAT_THREADS_PAGE, offset: 1 } },
        error: new Error('timeout'),
      },
    ]);
    expect(await screen.findByText('Pod p1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('[VenueChatsTab] show more failed', expect.any(Error)));
    expect(screen.getByText('Pod p1')).toBeInTheDocument();
  });

  it('opens a chat read-only under its pod’s title and goes back to the list', async () => {
    mount([threadsMock([row('p1'), row('p2')], 2), messagesMock('p2')]);
    fireEvent.click(await screen.findByText('Pod p2'));

    expect(await screen.findByText('Nobody has written in this chat yet.')).toBeInTheDocument();
    expect(screen.getByText('Pod p2')).toBeInTheDocument();
    expect(screen.queryByText('Pod p1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to chats' }));
    expect(await screen.findByText('Pod p1')).toBeInTheDocument();
  });
});
