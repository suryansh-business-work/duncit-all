import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ChatPreviewCard } from '@/components/chat-preview/ChatPreviewCard';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

const line = (id: string, text: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: `u-${id}`,
  user_name: `Name ${id}`,
  user_photo: null,
  type: 'TEXT',
  text,
  createdAt: `2026-10-0${id.length}T10:00:00.000Z`,
  ...extra,
});

const preview = (over: Record<string, unknown>) => ({
  chatPreview: { messages: [], total_count: 0, is_member: true, closed: false, ...over },
});

beforeEach(() => {
  mockRequest.mockReset();
});

describe('ChatPreviewCard', () => {
  it('shows a member the whole history with its count, and opens the room', async () => {
    mockRequest.mockResolvedValue(
      preview({
        messages: [
          line('a', 'Court no. 8', { user_photo: 'https://img.example/a.jpg' }),
          line('b', 'Any spot left?', { user_name: null }),
        ],
        total_count: 2,
      }),
    );
    const onOpen = jest.fn();
    renderWithProviders(<ChatPreviewCard kind="POD" id="p1" onOpen={onOpen} />);
    expect(screen.getByTestId('chat-preview-loading')).toBeOnTheScreen();
    expect(await screen.findByText('Court no. 8')).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { podId: 'p1', limit: 50, before: undefined },
      { auth: true },
    );
    expect(screen.getByText('Name a')).toBeOnTheScreen();
    // A writer with no name yet still gets an avatar letter.
    expect(screen.getByText('?')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-preview-count')).toHaveTextContent('2 messages');
    expect(screen.getByTestId('chat-preview-status')).toHaveTextContent('Live now');
    expect(screen.queryByTestId('chat-preview-earlier')).toBeNull();
    fireEvent.press(screen.getByTestId('chat-preview-open'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('lets a pod visitor read along, with the room locked until they book', async () => {
    mockRequest.mockResolvedValue(
      preview({ messages: [line('a', '', { type: 'IMAGE' })], total_count: 1, is_member: false }),
    );
    renderWithProviders(<ChatPreviewCard kind="POD" id="p1" onOpen={jest.fn()} />);
    expect(await screen.findByText('Photo')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-preview-count')).toHaveTextContent('1 message');
    // The pill also holds the lock glyph, so match its words, not its whole text.
    expect(screen.getByTestId('chat-preview-locked')).toHaveTextContent(/Join the room/);
    expect(screen.getByTestId('chat-preview-locked-hint')).toHaveTextContent(
      'Book a spot to join the pod chat.',
    );
    expect(screen.queryByTestId('chat-preview-join')).toBeNull();
    expect(screen.queryByTestId('chat-preview-open')).toBeNull();
  });

  it('joins a club visitor through the follow, then reads the room as a member', async () => {
    mockRequest
      .mockResolvedValueOnce(
        preview({
          messages: [line('a', 'Season starts Sunday')],
          total_count: 1,
          is_member: false,
        }),
      )
      .mockResolvedValueOnce(
        preview({ messages: [line('a', 'Season starts Sunday')], total_count: 1, is_member: true }),
      );
    const onJoinClub = jest.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <ChatPreviewCard kind="CLUB" id="c1" onOpen={jest.fn()} onJoinClub={onJoinClub} />,
    );
    expect(await screen.findByText('Club chat')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-preview-locked-hint')).toHaveTextContent(
      'Join this club to chat with its members.',
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('chat-preview-join'));
    });
    expect(await screen.findByTestId('chat-preview-open')).toBeOnTheScreen();
    expect(onJoinClub).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { clubId: 'c1', limit: 50, before: undefined },
      { auth: true },
    );
  });

  it('pages back through earlier messages, and says so when a page fails', async () => {
    mockRequest
      .mockResolvedValueOnce(
        preview({ messages: [line('cc', 'third'), line('ddd', 'fourth')], total_count: 4 }),
      )
      .mockResolvedValueOnce(
        preview({ messages: [line('b', 'second'), line('cc', 'third')], total_count: 4 }),
      )
      .mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<ChatPreviewCard kind="POD" id="p1" onOpen={jest.fn()} />);
    const earlier = await screen.findByTestId('chat-preview-earlier');
    await act(async () => {
      fireEvent.press(earlier);
    });
    expect(await screen.findByText('second')).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { podId: 'p1', limit: 50, before: '2026-10-02T10:00:00.000Z' },
      { auth: true },
    );
    expect(screen.getAllByText('third')).toHaveLength(1);
    await act(async () => {
      fireEvent.press(screen.getByTestId('chat-preview-earlier'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('The chat could not load.');
    expect(screen.getByText('second')).toBeOnTheScreen();
  });

  it('loads the earlier page as the reader scrolls up to the top of its fixed box, one page at a time', async () => {
    let resolveEarlier: (value: unknown) => void = () => undefined;
    mockRequest
      .mockResolvedValueOnce(
        preview({ messages: [line('cc', 'third'), line('ddd', 'fourth')], total_count: 4 }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveEarlier = resolve;
        }),
      );
    renderWithProviders(<ChatPreviewCard kind="POD" id="p1" onOpen={jest.fn()} />);
    await screen.findByText('third');
    const list = screen.getByTestId('chat-preview-list');
    expect(list).toHaveProp('nestedScrollEnabled', true);
    expect(list).toHaveProp('maintainVisibleContentPosition', { minIndexForVisible: 0 });
    const scrollTo = (y: number) =>
      fireEvent.scroll(list, { nativeEvent: { contentOffset: { y } } });

    // Downwards (the card opening on its newest line) asks for nothing.
    scrollTo(0);
    scrollTo(400);
    expect(mockRequest).toHaveBeenCalledTimes(1);

    scrollTo(60);
    expect(await screen.findByTestId('chat-preview-loading-earlier')).toBeOnTheScreen();
    // Still at the top while the page is on its way: no second request.
    scrollTo(10);
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { podId: 'p1', limit: 50, before: '2026-10-02T10:00:00.000Z' },
      { auth: true },
    );

    await act(async () => {
      resolveEarlier(preview({ messages: [line('b', 'second')], total_count: 4 }));
    });
    expect(await screen.findByText('second')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-preview-loading-earlier')).toBeNull();
  });

  it('does not ask for earlier lines on scroll once the whole room is shown', async () => {
    mockRequest.mockResolvedValue(preview({ messages: [line('a', 'only')], total_count: 1 }));
    renderWithProviders(<ChatPreviewCard kind="POD" id="p1" onOpen={jest.fn()} />);
    await screen.findByText('only');
    const list = screen.getByTestId('chat-preview-list');
    fireEvent.scroll(list, { nativeEvent: { contentOffset: { y: 300 } } });
    fireEvent.scroll(list, { nativeEvent: { contentOffset: { y: 0 } } });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('marks an ended pod’s room as Ended and an empty room as waiting for its first line', async () => {
    mockRequest.mockResolvedValue(preview({ closed: true }));
    renderWithProviders(<ChatPreviewCard kind="POD" id="p1" onOpen={jest.fn()} />);
    expect(await screen.findByTestId('chat-preview-empty')).toHaveTextContent(
      'No messages yet. Say hello!',
    );
    expect(screen.getByTestId('chat-preview-status')).toHaveTextContent('Ended');
    expect(screen.queryByTestId('chat-preview-count')).toBeNull();
  });

  it('says the chat could not load, and Try again asks again', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(preview({ messages: [line('a', 'Back again')], total_count: 1 }));
    renderWithProviders(<ChatPreviewCard kind="POD" id="p1" onOpen={jest.fn()} />);
    await screen.findByTestId('chat-preview-error');
    expect(screen.getByRole('alert')).toHaveTextContent('The chat could not load.');
    await act(async () => {
      fireEvent.press(screen.getByTestId('chat-preview-retry'));
    });
    await waitFor(() => expect(screen.getByText('Back again')).toBeOnTheScreen());
  });
});
