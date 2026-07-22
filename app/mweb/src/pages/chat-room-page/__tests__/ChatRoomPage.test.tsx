import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ChatRoomPage from '../ChatRoomPage';
import {
  CHAT_PARTICIPANTS,
  POD_MESSAGES,
  REACT_MSG,
  SEND_MSG,
} from '../queries';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'pod1' }),
  useNavigate: () => mockNavigate,
}));

// Capture the params passed to the socket hook so we can invoke its callbacks.
let socketParams: any = null;
vi.mock('../usePodSocket', () => ({
  usePodSocket: (params: any) => {
    socketParams = params;
  },
}));

// Replace the media picker (pulls in @duncit/media-picker) with a lightweight stub.
vi.mock('../../../components/MediaPickerDialog', () => ({
  default: ({ open, onPicked }: any) =>
    open ? (
      <button type="button" onClick={() => onPicked('https://img/pic.png')}>
        pick-image
      </button>
    ) : null,
}));

const FUTURE = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
const PAST_END = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

const otherMsg = {
  id: 'm1',
  pod_id: 'pod1',
  user_id: 'other',
  user_name: 'Bob',
  user_photo: null,
  type: 'TEXT',
  text: 'hello other',
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
};

const mineMsg = {
  id: 'm2',
  pod_id: 'pod1',
  user_id: 'me1',
  user_name: 'Me',
  user_photo: null,
  type: 'TEXT',
  text: 'my message',
  image_url: null,
  reactions: [],
  deleted: false,
  createdAt: new Date('2024-01-01T10:05:00Z').toISOString(),
};

const podActive = {
  id: 'p1',
  pod_title: 'Weekend Ride',
  pod_date_time: FUTURE,
  pod_end_date_time: null,
  pod_id: 'podX',
  club_slug: 'club1',
};

function messagesMock(pod = podActive, messages = [otherMsg, mineMsg]) {
  return {
    request: { query: POD_MESSAGES, variables: { pod_id: 'pod1', limit: 80 } },
    result: {
      data: { me: { user_id: 'me1' }, podMessages: messages, pod },
    },
  };
}

const participantsMock = {
  request: { query: CHAT_PARTICIPANTS, variables: { pod_id: 'pod1' } },
  result: {
    data: {
      chatParticipants: {
        participant_count: 2,
        hosts: [{ user_id: 'h1', full_name: 'Alice', profile_photo: null }],
        participants: [{ user_id: 'p1', full_name: 'Carl', profile_photo: null }],
      },
    },
  },
};

function renderPage(extraMocks: any[] = [], pod = podActive, messages = [otherMsg, mineMsg]) {
  return render(
    <MockedProvider
      mocks={[messagesMock(pod, messages), participantsMock, ...extraMocks]}
      addTypename={false}
    >
      <ChatRoomPage />
    </MockedProvider>,
  );
}

beforeAll(() => {
  // jsdom does not implement scrollTo — the page calls it in a layout effect.
  (Element.prototype as any).scrollTo = vi.fn();
});

beforeEach(() => {
  socketParams = null;
  mockNavigate.mockReset();
});

describe('ChatRoomPage', () => {
  it('shows a spinner while the first query is loading', () => {
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders messages, header title and participants once loaded', async () => {
    renderPage();
    expect(await screen.findByText('hello other')).toBeInTheDocument();
    expect(screen.getByText('my message')).toBeInTheDocument();
    expect(screen.getByText('Weekend Ride')).toBeInTheDocument();
    // participants section
    expect(screen.getByText('2 participants')).toBeInTheDocument();
  });

  it('navigates back to the chats list from the header', async () => {
    renderPage();
    await screen.findByText('hello other');
    // The back IconButton is the first button in the header.
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/chats');
  });

  it('opens the linked pod when the header title is tapped', async () => {
    renderPage();
    await screen.findByText('hello other');
    fireEvent.click(screen.getByTestId('chat-room-open-pod'));
    expect(mockNavigate).toHaveBeenCalledWith('/club/club1/pod/podX');
  });

  it('shows an error when the pod link is missing club/pod ids', async () => {
    const podNoSlug = { ...podActive, club_slug: null } as any;
    renderPage([], podNoSlug);
    await screen.findByText('hello other');
    fireEvent.click(screen.getByTestId('chat-room-open-pod'));
    expect(
      await screen.findByText('Pod details are unavailable for this chat.'),
    ).toBeInTheDocument();
    // dismiss the alert
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(
        screen.queryByText('Pod details are unavailable for this chat.'),
      ).not.toBeInTheDocument(),
    );
  });

  it('opens a participant profile when a chip is clicked', async () => {
    renderPage();
    await screen.findByText('2 participants');
    fireEvent.click(screen.getByTestId('chat-person-p1'));
    expect(mockNavigate).toHaveBeenCalledWith('/u/p1');
  });

  it('sends a text message and clears the composer', async () => {
    const sendMock = {
      request: {
        query: SEND_MSG,
        variables: { pod_id: 'pod1', type: 'TEXT', text: 'hi there', image_url: null },
      },
      result: { data: { sendPodMessage: { id: 'new1' } } },
    };
    renderPage([sendMock]);
    await screen.findByText('hello other');
    const input = screen.getByPlaceholderText('Type a message');
    fireEvent.change(input, { target: { value: 'hi there' } });
    // Send is the last button (primary send IconButton).
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''));
  });

  it('does not send when the composer is empty (guard clause)', async () => {
    renderPage();
    await screen.findByText('hello other');
    const input = screen.getByPlaceholderText('Type a message') as HTMLInputElement;
    // Whitespace only -> trimmed empty, no send, no throw.
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('   ');
  });

  it('sends an image through the media picker', async () => {
    const imageMock = {
      request: {
        query: SEND_MSG,
        variables: { pod_id: 'pod1', type: 'IMAGE', text: '', image_url: 'https://img/pic.png' },
      },
      result: { data: { sendPodMessage: { id: 'img1' } } },
    };
    renderPage([imageMock]);
    await screen.findByText('hello other');
    // Open picker: the image IconButton is the second button in the composer.
    fireEvent.click(screen.getByRole('button', { name: 'Image' }));
    fireEvent.click(await screen.findByText('pick-image'));
    // If the mutation variables did not match, MockedProvider would surface an error.
    await waitFor(() =>
      expect(screen.queryByText('pick-image')).not.toBeInTheDocument(),
    );
  });

  it('inserts an emoji into the composer text', async () => {
    const { container } = renderPage();
    await screen.findByText('hello other');
    const emojiBtn = container
      .querySelector('[data-testid="EmojiEmotionsIcon"]')!
      .closest('button')!;
    fireEvent.click(emojiBtn);
    fireEvent.click(await screen.findByText('👍'));
    const input = screen.getByPlaceholderText('Type a message') as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('👍'));
  });

  it('reacts to a message via double-click', async () => {
    const reactMock = {
      request: { query: REACT_MSG, variables: { message_id: 'm1', emoji: '👍' } },
      result: {
        data: {
          reactToPodMessage: {
            id: 'm1',
            reactions: [{ user_id: 'me1', emoji: '👍' }],
          },
        },
      },
    };
    renderPage([reactMock]);
    await screen.findByText('hello other');
    fireEvent.doubleClick(screen.getByText('hello other'));
    fireEvent.click(await screen.findByText('👍'));
    await waitFor(() => expect(screen.queryByText('👍')).not.toBeInTheDocument());
  });

  it('shows the closed notice instead of the composer for an ended pod', async () => {
    const endedPod = { ...podActive, pod_date_time: PAST, pod_end_date_time: PAST_END } as any;
    renderPage([], endedPod);
    await screen.findByText('hello other');
    expect(screen.getByText('This pod has ended — chat is closed.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message')).not.toBeInTheDocument();
  });

  it('merges a live socket message and applies reaction updates', async () => {
    renderPage();
    await screen.findByText('hello other');
    expect(socketParams).toBeTruthy();

    act(() => {
      socketParams.onMessage({
        id: 'live1',
        user_id: 'other',
        user_name: 'Zoe',
        type: 'TEXT',
        text: 'live text',
        reactions: [],
        createdAt: new Date('2024-01-01T11:00:00Z').toISOString(),
      });
    });
    expect(await screen.findByText('live text')).toBeInTheDocument();

    act(() => {
      socketParams.onReactionUpdate({
        id: 'live1',
        reactions: [{ user_id: 'x', emoji: '🔥' }],
      });
    });
    expect(await screen.findByText(/🔥/)).toBeInTheDocument();
  });

  it('surfaces socket errors through an alert', async () => {
    renderPage();
    await screen.findByText('hello other');
    act(() => socketParams.onError('Cannot join chat'));
    expect(await screen.findByText('Cannot join chat')).toBeInTheDocument();
  });
});
