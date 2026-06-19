import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { ChatWithUsScreen } from '@/screens/ChatWithUsScreen';
import { LiveChatScreen } from '@/screens/LiveChatScreen';
import { AllSupportTicketsScreen } from '@/screens/AllSupportTicketsScreen';
import { TicketDetailsScreen } from '@/screens/TicketDetailsScreen';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useTickets } from '@/hooks/useSupport';
import { useTicketDetails, useUnifiedTickets } from '@/hooks/useUnifiedTickets';
import { shareTranscript } from '@/utils/transcript';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupportChat');
jest.mock('@/hooks/useSupport', () => ({ useTickets: jest.fn() }));
jest.mock('@/hooks/useUnifiedTickets', () => ({
  useUnifiedTickets: jest.fn(),
  useTicketDetails: jest.fn(),
}));
jest.mock('@/utils/transcript', () => ({
  shareTranscript: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { ticketId: 't1' } }),
}));

const mockedChat = useSupportChat as jest.Mock;
const mockedTickets = useTickets as jest.Mock;
const mockedUnified = useUnifiedTickets as jest.Mock;
const mockedDetails = useTicketDetails as jest.Mock;
const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockShare = shareTranscript as jest.Mock;

const chatMsg = (id: string, role: string, over: Record<string, unknown> = {}) => ({
  id,
  session_id: 's1',
  sender_id: 'u1',
  sender_role: role,
  sender_name: role === 'AGENT' ? 'Agent A' : 'Me',
  sender_photo: null,
  text: `text-${id}`,
  attachments: [],
  is_ai: false,
  created_at: new Date().toISOString(),
  ...over,
});

const session = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  ticket_no: 'CH-AAA111',
  status: 'OPEN',
  agent_id: null,
  ai_active: true,
  agent_last_read_at: null,
  ...over,
});

const chatBase = () => ({
  session: session(),
  messages: [],
  isLoading: false,
  error: '',
  typing: false,
  aiThinking: false,
  send: jest.fn().mockResolvedValue(undefined),
  uploadAttachment: jest.fn().mockResolvedValue('https://img/up.jpg'),
  emitTyping: jest.fn(),
  resolve: jest.fn().mockResolvedValue(undefined),
  reopen: jest.fn().mockResolvedValue(undefined),
  submitFeedback: jest.fn().mockResolvedValue(undefined),
  getTranscript: jest.fn().mockResolvedValue({ filename: 'support-CH.txt', text: 'log' }),
  emailTranscript: jest.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedChat.mockReturnValue(chatBase());
  mockedTickets.mockReturnValue({ tickets: [], isLoading: false, reload: jest.fn() });
});

const ticket = {
  id: 't1',
  subject: 'Refund please',
  category: 'PAYMENT',
  status: 'OPEN',
  priority: 'LOW',
  message_count: 1,
  last_message_at: '',
  created_at: '',
};

describe('ChatWithUsScreen (inbox)', () => {
  it('shows the live-chat shortcut and the loading state', () => {
    mockedTickets.mockReturnValue({ tickets: [], isLoading: true, reload: jest.fn() });
    renderWithProviders(<ChatWithUsScreen />);
    expect(screen.getByTestId('chat-live-card')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-inbox-loading')).toBeOnTheScreen();
  });

  it('shows the empty state and routes taps', () => {
    renderWithProviders(<ChatWithUsScreen />);
    expect(screen.getByTestId('chat-inbox-empty')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-live-card'));
    expect(mockNavigate).toHaveBeenCalledWith('LiveChat');
    fireEvent.press(screen.getByTestId('chat-inbox-new'));
    expect(mockNavigate).toHaveBeenCalledWith('SupportTickets');
  });

  it('lists tickets and opens one', () => {
    mockedTickets.mockReturnValue({ tickets: [ticket], isLoading: false, reload: jest.fn() });
    renderWithProviders(<ChatWithUsScreen />);
    fireEvent.press(screen.getByTestId('chat-inbox-ticket-t1'));
    expect(mockNavigate).toHaveBeenCalledWith('TicketDetails', { ticketId: 't1' });
  });
});

describe('LiveChatScreen — states + messages', () => {
  it('shows loader / error / empty', () => {
    mockedChat.mockReturnValue({ ...chatBase(), isLoading: true });
    const a = renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-chat-loading')).toBeOnTheScreen();
    a.unmount();

    mockedChat.mockReturnValue({ ...chatBase(), error: 'offline' });
    const b = renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-chat-error')).toHaveTextContent('offline');
    b.unmount();

    mockedChat.mockReturnValue(chatBase());
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-chat-empty')).toBeOnTheScreen();
    expect(screen.getByText(/CH-AAA111/)).toBeOnTheScreen();
  });

  it('renders user(seen)/agent/ai/system bubbles, a day label and the typing line', () => {
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({ agent_last_read_at: '2999-01-01T00:00:00Z' }),
      typing: true,
      messages: [
        chatMsg('1', 'USER', { created_at: '2000-01-01T10:00:00Z' }),
        chatMsg('2', 'SYSTEM', { text: 'Picked up by Agent A' }),
        chatMsg('3', 'AGENT', {
          is_ai: true,
          attachments: ['https://img/a.jpg', 'https://x/doc.pdf'],
        }),
      ],
    });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByText('Picked up by Agent A')).toBeOnTheScreen();
    expect(screen.getByText('Duncit Assistant')).toBeOnTheScreen();
    expect(screen.getByTestId('tick-1')).toBeOnTheScreen();
    expect(screen.getByTestId('day-1')).toBeOnTheScreen();
    expect(screen.getByTestId('support-typing')).toBeOnTheScreen();
    // Non-image attachment opens via the file chip.
    fireEvent.press(screen.getByTestId('support-attach-https://x/doc.pdf'));
  });

  it('shows the AI thinking indicator while the bot replies', () => {
    mockedChat.mockReturnValue({ ...chatBase(), aiThinking: true });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-typing')).toHaveTextContent('Duncit Assistant is typing…');
  });

  it('shows a delivered tick when the agent has not read yet', () => {
    mockedChat.mockReturnValue({
      ...chatBase(),
      messages: [chatMsg('1', 'USER')],
    });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('tick-1')).toBeOnTheScreen();
  });
});

describe('LiveChatScreen — send + attach', () => {
  it('sends a typed message and ignores an empty second press', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase(), send });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'hello');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    fireEvent.press(screen.getByTestId('support-chat-send'));
    await waitFor(() => expect(send).toHaveBeenCalledWith('hello', []));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('signals typing once per throttle window', () => {
    const emitTyping = jest.fn();
    mockedChat.mockReturnValue({ ...chatBase(), emitTyping });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'a');
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'ab');
    expect(emitTyping).toHaveBeenCalledTimes(1);
  });

  it('ignores a send while an attachment upload is in flight', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest
      .fn()
      .mockImplementation(() => new Promise<string>(() => undefined));
    mockedChat.mockReturnValue({ ...chatBase(), send, uploadAttachment });
    renderWithProviders(<LiveChatScreen />);
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: false, assets: [{ base64: 'abc' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() => expect(uploadAttachment).toHaveBeenCalled());
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'hi');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    expect(send).not.toHaveBeenCalled();
  });

  it('surfaces a send failure', async () => {
    const send = jest.fn().mockRejectedValue(new Error('server busy'));
    mockedChat.mockReturnValue({ ...chatBase(), send });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'hi');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent('server busy'),
    );
  });

  it('attaches: permission denied, cancel, success and failure', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/up.jpg');
    mockedChat.mockReturnValue({ ...chatBase(), send, uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValueOnce({ granted: false });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent(/photo access/i),
    );

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: true });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() => expect(uploadAttachment).not.toHaveBeenCalled());

    launch.mockResolvedValueOnce({ canceled: false, assets: [{ base64: 'abc' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() => expect(send).toHaveBeenCalledWith('', ['https://img/up.jpg']));

    uploadAttachment.mockRejectedValueOnce(new Error('upload failed'));
    launch.mockResolvedValueOnce({ canceled: false, assets: [{ base64: 'abc' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent('upload failed'),
    );
  });
});

describe('LiveChatScreen — actions', () => {
  it('resolves then submits feedback (and can skip)', async () => {
    const resolve = jest.fn().mockResolvedValue(undefined);
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase(), resolve, submitFeedback });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    await waitFor(() => expect(resolve).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('support-feedback-modal')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('feedback-star-4'));
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith(4, ''));
  });

  it('closes the feedback modal on skip', async () => {
    const resolve = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase(), resolve });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    await waitFor(() => expect(screen.getByTestId('support-feedback-modal')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('feedback-skip'));
    expect(screen.queryByTestId('support-feedback-modal')).toBeNull();
  });

  it('re-opens a resolved chat and shows the closed note', () => {
    const reopen = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase(), session: session({ status: 'CLOSED' }), reopen });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('chat-closed-note')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    expect(reopen).toHaveBeenCalled();
  });

  it('downloads the transcript and skips when none', async () => {
    const getTranscript = jest.fn().mockResolvedValue({ filename: 'f.txt', text: 'log' });
    mockedChat.mockReturnValue({ ...chatBase(), getTranscript });
    const a = renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-download'));
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('f.txt', 'log'));
    a.unmount();

    mockShare.mockClear();
    mockedChat.mockReturnValue({ ...chatBase(), getTranscript: jest.fn().mockResolvedValue(null) });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-download'));
    await waitFor(() => expect(mockShare).not.toHaveBeenCalled());
  });

  it('emails the transcript (success then a failure)', async () => {
    const emailTranscript = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase(), emailTranscript });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-email'));
    fireEvent.changeText(screen.getByTestId('email-input'), 'me@x.com');
    fireEvent.press(screen.getByTestId('email-send'));
    await waitFor(() => expect(emailTranscript).toHaveBeenCalledWith('me@x.com'));
    await waitFor(() => expect(screen.getByTestId('email-done')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('email-close'));

    emailTranscript.mockRejectedValueOnce(new Error('mail down'));
    fireEvent.press(screen.getByTestId('chat-action-email'));
    fireEvent.changeText(screen.getByTestId('email-input'), 'me@x.com');
    fireEvent.press(screen.getByTestId('email-send'));
    await waitFor(() => expect(screen.getByTestId('email-error')).toHaveTextContent('mail down'));
  });

  it('shows the jump-to-latest button after scrolling up', () => {
    mockedChat.mockReturnValue({ ...chatBase(), messages: [chatMsg('1', 'USER')] });
    renderWithProviders(<LiveChatScreen />);
    const scroller = screen.getByTestId('support-msg-1').parent!;
    fireEvent.scroll(scroller, {
      nativeEvent: {
        contentOffset: { y: 0 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 300 },
      },
    });
    fireEvent.press(screen.getByTestId('chat-jump-bottom'));
  });

  it('hides the header actions while the session is still booting', () => {
    mockedChat.mockReturnValue({ ...chatBase(), session: null, isLoading: true });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.queryByTestId('chat-action-toggle')).toBeNull();
  });
});

describe('AllSupportTicketsScreen', () => {
  const rows = [
    {
      id: 't1',
      ticket_no: 'ST-AAA111',
      title: 'Refund',
      status: 'OPEN',
      source: 'TICKET',
      created_at: '',
    },
    {
      id: 'c1',
      ticket_no: 'CH-BBB222',
      title: 'Hi there',
      status: 'OPEN',
      source: 'CHAT',
      created_at: '',
    },
    {
      id: 's1',
      ticket_no: 'SOS-CCC333',
      title: 'Help',
      status: 'ACTIVE',
      source: 'SOS',
      created_at: '',
    },
  ];

  it('shows loading / error / empty states', () => {
    mockedUnified.mockReturnValue({ rows: [], isLoading: true, error: '' });
    const a = renderWithProviders(<AllSupportTicketsScreen />);
    expect(screen.getByTestId('all-tickets-loading')).toBeOnTheScreen();
    a.unmount();

    mockedUnified.mockReturnValue({ rows: [], isLoading: false, error: 'offline' });
    const b = renderWithProviders(<AllSupportTicketsScreen />);
    expect(screen.getByTestId('all-tickets-error')).toBeOnTheScreen();
    b.unmount();

    mockedUnified.mockReturnValue({ rows: [], isLoading: false, error: '' });
    renderWithProviders(<AllSupportTicketsScreen />);
    expect(screen.getByTestId('all-tickets-empty')).toBeOnTheScreen();
  });

  it('labels an unknown source with its raw value', () => {
    mockedUnified.mockReturnValue({
      rows: [
        {
          id: 'x1',
          ticket_no: 'XX-000001',
          title: 'Odd',
          status: 'OPEN',
          source: 'OTHER',
          created_at: '',
        },
      ],
      isLoading: false,
      error: '',
    });
    renderWithProviders(<AllSupportTicketsScreen />);
    expect(screen.getByText('OTHER')).toBeOnTheScreen();
  });

  it('lists prefixed rows and routes ticket/chat/sos taps appropriately', () => {
    mockedUnified.mockReturnValue({ rows, isLoading: false, error: '' });
    renderWithProviders(<AllSupportTicketsScreen />);
    fireEvent.press(screen.getByTestId('all-ticket-ST-AAA111'));
    expect(mockNavigate).toHaveBeenCalledWith('TicketDetails', { ticketId: 't1' });
    fireEvent.press(screen.getByTestId('all-ticket-CH-BBB222'));
    expect(mockNavigate).toHaveBeenCalledWith('LiveChat');
    mockNavigate.mockClear();
    fireEvent.press(screen.getByTestId('all-ticket-SOS-CCC333'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('TicketDetailsScreen', () => {
  const detail = (status: string) => ({
    id: 't1',
    subject: 'Refund issue',
    category: 'PAYMENT',
    status,
    created_at: '',
    messages: [
      {
        id: 'm1',
        author_role: 'USER',
        author_name: 'Me',
        body_text: 'Please refund',
        attachments: [],
        created_at: '',
      },
      {
        id: 'm2',
        author_role: 'AGENT',
        author_name: 'Agent A',
        body_text: 'On it',
        attachments: [],
        created_at: '',
      },
    ],
  });

  it('shows loading, the thread and the missing state', () => {
    mockedDetails.mockReturnValue({
      ticket: null,
      isLoading: true,
      reply: jest.fn(),
      reopen: jest.fn(),
    });
    const a = renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-details-loading')).toBeOnTheScreen();
    a.unmount();

    mockedDetails.mockReturnValue({
      ticket: detail('OPEN'),
      isLoading: false,
      reply: jest.fn(),
      reopen: jest.fn(),
    });
    const b = renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByText('On it')).toBeOnTheScreen();
    expect(screen.queryByTestId('ticket-reopen')).toBeNull();
    b.unmount();

    mockedDetails.mockReturnValue({
      ticket: null,
      isLoading: false,
      reply: jest.fn(),
      reopen: jest.fn(),
    });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-details-missing')).toBeOnTheScreen();
  });

  it('sends a reply (empty is a no-op) and surfaces failures', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    mockedDetails.mockReturnValue({
      ticket: detail('OPEN'),
      isLoading: false,
      reply,
      reopen: jest.fn(),
    });
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    expect(reply).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId('ticket-reply-input'), 'thanks');
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    await waitFor(() => expect(reply).toHaveBeenCalledWith('thanks'));

    reply.mockRejectedValueOnce(new Error('server busy'));
    fireEvent.changeText(screen.getByTestId('ticket-reply-input'), 'again');
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    await waitFor(() =>
      expect(screen.getByTestId('ticket-reply-error')).toHaveTextContent('server busy'),
    );
  });

  it('re-opens a resolved ticket (ignores a second press, then surfaces a failure)', async () => {
    let resolveReopen: () => void = () => undefined;
    const reopen = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReopen = resolve;
        }),
    );
    mockedDetails.mockReturnValue({
      ticket: detail('RESOLVED'),
      isLoading: false,
      reply: jest.fn(),
      reopen,
    });
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-reopen'));
    fireEvent.press(screen.getByTestId('ticket-reopen')); // busy → no-op
    expect(reopen).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveReopen();
      await Promise.resolve();
    });

    reopen.mockRejectedValueOnce(new Error('cannot reopen'));
    fireEvent.press(screen.getByTestId('ticket-reopen'));
    await waitFor(() =>
      expect(screen.getByTestId('ticket-reply-error')).toHaveTextContent('cannot reopen'),
    );
  });
});
