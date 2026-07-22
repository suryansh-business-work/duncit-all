import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

import ChatsPage from '../ChatsPage';

// Identical document to the (unexported) query the component fires; MockedProvider
// matches by the printed AST so the text must match exactly.
const MY_CHAT_ROOMS = gql`
  query MyChatRooms {
    myChatRooms {
      id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_attendees
      no_of_spots
      cover_url
      club_id
      super_category_id
    }
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
  }
`;

const HOUR = 60 * 60 * 1000;
const now = Date.now();

const room = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  pod_title: `Pod ${id}`,
  pod_date_time: new Date(now - HOUR).toISOString(), // started an hour ago => LIVE
  pod_end_date_time: new Date(now + HOUR).toISOString(), // ends in an hour
  pod_attendees: ['a', 'b'],
  no_of_spots: 5,
  cover_url: null,
  club_id: 'c1',
  super_category_id: 's1',
  ...over,
});

const endedRoom = (id: string, over: Record<string, unknown> = {}) =>
  room(id, {
    pod_date_time: new Date(now - 3 * HOUR).toISOString(),
    pod_end_date_time: new Date(now - 2 * HOUR).toISOString(),
    ...over,
  });

const chatMock = (rooms: unknown[], supers: unknown[] = [{ id: 's1', slug: 'sports' }]) => ({
  request: { query: MY_CHAT_ROOMS },
  result: { data: { myChatRooms: rooms, superCategories: supers } },
});

const setup = (mocks: unknown[], ui: ReactElement) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      {ui}
    </MockedProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('ChatsPage', () => {
  it('shows the loading spinner before data resolves', () => {
    setup([chatMock([room('1')])], <ChatsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the error alert when the query fails', async () => {
    setup([{ request: { query: MY_CHAT_ROOMS }, error: new Error('boom') }], <ChatsPage />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('renders the header count and pod chat cards', async () => {
    setup([chatMock([room('1'), room('2')])], <ChatsPage />);
    expect(await screen.findByText('Pod 1')).toBeInTheDocument();
    expect(screen.getByText('Pod 2')).toBeInTheDocument();
    expect(screen.getByText('2 pod chats connected right now')).toBeInTheDocument();
    // live chip + members count
    expect(screen.getAllByText('Live').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2/5 members').length).toBe(2);
  });

  it('uses singular "chat" wording for a single room', async () => {
    setup([chatMock([room('1')])], <ChatsPage />);
    expect(await screen.findByText('1 pod chat connected right now')).toBeInTheDocument();
  });

  it('renders the ACTIVE PODS strip on the ALL filter and navigates from an avatar', async () => {
    setup([chatMock([room('1')])], <ChatsPage />);
    await screen.findByText('Pod 1');
    expect(screen.getByText('ACTIVE PODS · 1')).toBeInTheDocument();
    // The strip avatar is the first GroupsIcon-bearing clickable box.
    const openLink = screen.getByText('Open');
    fireEvent.click(openLink);
    expect(navigate).toHaveBeenCalledWith('/chats/1');
  });

  it('navigates to the chat room from the active strip avatar', async () => {
    setup([chatMock([room('7')])], <ChatsPage />);
    await screen.findByText('Pod 7');
    // click the strip box (contains a Groups icon, parent Box has the onClick)
    const strip = screen.getByText('ACTIVE PODS · 1').closest('div');
    const avatarBox = strip?.querySelector('[class*="MuiAvatar-root"]')?.parentElement;
    fireEvent.click(avatarBox as Element);
    expect(navigate).toHaveBeenCalledWith('/chats/7');
  });

  it('filters by search term and shows the no-match empty state', async () => {
    setup([chatMock([room('1')])], <ChatsPage />);
    await screen.findByText('Pod 1');
    fireEvent.change(screen.getByPlaceholderText('Search chats by pod name'), {
      target: { value: 'zzz-none' },
    });
    expect(await screen.findByText('No chats match your filters.')).toBeInTheDocument();
  });

  it('filters to UPCOMING and PREVIOUS via the status chips', async () => {
    setup([chatMock([room('live'), endedRoom('past')])], <ChatsPage />);
    await screen.findByText('Pod live');
    expect(screen.getByText('Pod past')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Previous Pods'));
    await waitFor(() => expect(screen.queryByText('Pod live')).not.toBeInTheDocument());
    expect(screen.getByText('Pod past')).toBeInTheDocument();
    // Active strip hidden when not on ALL
    expect(screen.queryByText(/ACTIVE PODS/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Upcoming Pods'));
    await waitFor(() => expect(screen.queryByText('Pod past')).not.toBeInTheDocument());
    expect(screen.getByText('Pod live')).toBeInTheDocument();
  });

  it('shows the no-pods-joined empty state when there are no rooms', async () => {
    setup([chatMock([])], <ChatsPage />);
    expect(
      await screen.findByText(
        "You haven't joined any pods yet. Join or host a pod to start chatting with attendees.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('0 pod chats connected right now')).toBeInTheDocument();
  });

  it('scopes rooms to the header super category slug', async () => {
    setup(
      [
        chatMock(
          [room('1', { super_category_id: 's1' }), room('2', { super_category_id: 's2' })],
          [
            { id: 's1', slug: 'sports' },
            { id: 's2', slug: 'pets' },
          ],
        ),
      ],
      <ChatsPage superCategorySlug="pets" />,
    );
    expect(await screen.findByText('Pod 2')).toBeInTheDocument();
    expect(screen.queryByText('Pod 1')).not.toBeInTheDocument();
  });

  it('renders fallback label when a room has no start time', async () => {
    setup([chatMock([room('1', { pod_date_time: null, pod_end_date_time: null })])], <ChatsPage />);
    expect(await screen.findByText('Pod chat')).toBeInTheDocument();
  });
});
