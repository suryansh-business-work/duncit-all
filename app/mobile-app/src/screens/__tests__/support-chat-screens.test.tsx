import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { ChatWithUsScreen } from '@/screens/ChatWithUsScreen';
import { LiveChatScreen } from '@/screens/LiveChatScreen';
import { AllSupportTicketsScreen } from '@/screens/AllSupportTicketsScreen';
import { TicketDetailsScreen } from '@/screens/TicketDetailsScreen';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useTickets } from '@/hooks/useSupport';
import { useTicketDetails, useUnifiedTickets } from '@/hooks/useUnifiedTickets';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupportChat');
jest.mock('@/hooks/useSupport', () => ({ useTickets: jest.fn() }));
jest.mock('@/hooks/useUnifiedTickets', () => ({
  useUnifiedTickets: jest.fn(),
  useTicketDetails: jest.fn(),
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

const chatMsg = (id: string, role: string, over: Record<string, unknown> = {}) => ({
  id,
  session_id: 's1',
  sender_id: 'u1',
  sender_role: role,
  sender_name: role === 'AGENT' ? 'Agent A' : 'Me',
  sender_photo: null,
  text: `text-${id}`,
  attachments: [],
  created_at: new Date().toISOString(),
  ...over,
});

const chatBase = {
  sessionId: 's1',
  messages: [],
  isLoading: false,
  error: '',
  send: jest.fn().mockResolvedValue(undefined),
  uploadImage: jest.fn().mockResolvedValue('https://img/up.jpg'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedChat.mockReturnValue({ ...chatBase });
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

  it('shows the empty state when there are no tickets', () => {
    renderWithProviders(<ChatWithUsScreen />);
    expect(screen.getByTestId('chat-inbox-empty')).toBeOnTheScreen();
  });

  it('opens the live chat, a ticket, and the new-ticket form', () => {
    mockedTickets.mockReturnValue({ tickets: [ticket], isLoading: false, reload: jest.fn() });
    renderWithProviders(<ChatWithUsScreen />);

    fireEvent.press(screen.getByTestId('chat-live-card'));
    expect(mockNavigate).toHaveBeenCalledWith('LiveChat');

    fireEvent.press(screen.getByTestId('chat-inbox-ticket-t1'));
    expect(mockNavigate).toHaveBeenCalledWith('TicketDetails', { ticketId: 't1' });

    fireEvent.press(screen.getByTestId('chat-inbox-new'));
    expect(mockNavigate).toHaveBeenCalledWith('SupportTickets');
  });
});

describe('LiveChatScreen (real-time chat)', () => {
  it('shows the loader, then the empty state', () => {
    mockedChat.mockReturnValue({ ...chatBase, isLoading: true });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-chat-loading')).toBeOnTheScreen();

    mockedChat.mockReturnValue({ ...chatBase });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-chat-empty')).toBeOnTheScreen();
  });

  it('shows a boot error', () => {
    mockedChat.mockReturnValue({ ...chatBase, error: 'offline' });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-chat-error')).toHaveTextContent('offline');
  });

  it('keeps the view pinned to the end as content grows', () => {
    mockedChat.mockReturnValue({ ...chatBase, messages: [chatMsg('1', 'USER')] });
    renderWithProviders(<LiveChatScreen />);
    fireEvent(screen.getByTestId('support-msg-1').parent!, 'contentSizeChange', 100, 400);
    expect(screen.getByTestId('support-msg-1')).toBeOnTheScreen();
  });

  it('renders user/agent/system bubbles incl. the pickup announcement', () => {
    mockedChat.mockReturnValue({
      ...chatBase,
      messages: [
        chatMsg('1', 'USER'),
        chatMsg('2', 'SYSTEM', { text: 'Picked up by Agent A' }),
        chatMsg('3', 'AGENT', { attachments: ['https://img/a.jpg'] }),
      ],
    });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByText('Picked up by Agent A')).toBeOnTheScreen();
    expect(screen.getByText('Agent A')).toBeOnTheScreen();
    expect(screen.getByTestId('support-msg-3')).toBeOnTheScreen();
  });

  it('sends a typed message', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase, send });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'hello');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    await waitFor(() => expect(send).toHaveBeenCalledWith('hello', []));
  });

  it('ignores a second send while one is in flight', async () => {
    let resolveSend: () => void = () => undefined;
    const send = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    mockedChat.mockReturnValue({ ...chatBase, send });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'hello');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    fireEvent.press(screen.getByTestId('support-chat-send'));
    expect(send).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      resolveSend();
      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  it('surfaces a send failure', async () => {
    const send = jest.fn().mockRejectedValue(new Error('server busy'));
    mockedChat.mockReturnValue({ ...chatBase, send });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'hello');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent('server busy'),
    );
  });

  it('attaches an image: permission denied, cancel, success and failure', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const uploadImage = jest.fn().mockResolvedValue('https://img/up.jpg');
    mockedChat.mockReturnValue({ ...chatBase, send, uploadImage });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValueOnce({ granted: false });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent(/photo access/i),
    );

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: true });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() => expect(uploadImage).not.toHaveBeenCalled());

    launch.mockResolvedValueOnce({ canceled: false, assets: [{ base64: 'abc' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() => expect(send).toHaveBeenCalledWith('', ['https://img/up.jpg']));

    uploadImage.mockRejectedValueOnce(new Error('upload failed'));
    launch.mockResolvedValueOnce({ canceled: false, assets: [{ base64: 'abc' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent('upload failed'),
    );
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
    renderWithProviders(<AllSupportTicketsScreen />);
    expect(screen.getByTestId('all-tickets-loading')).toBeOnTheScreen();

    mockedUnified.mockReturnValue({ rows: [], isLoading: false, error: 'offline' });
    renderWithProviders(<AllSupportTicketsScreen />);
    expect(screen.getByTestId('all-tickets-error')).toBeOnTheScreen();

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
    expect(screen.getByText('ST-AAA111')).toBeOnTheScreen();

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
  const ticket = {
    id: 't1',
    subject: 'Refund issue',
    category: 'PAYMENT',
    status: 'OPEN',
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
  };

  it('shows loading then the thread', () => {
    mockedDetails.mockReturnValue({ ticket: null, isLoading: true, reply: jest.fn() });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-details-loading')).toBeOnTheScreen();

    mockedDetails.mockReturnValue({ ticket, isLoading: false, reply: jest.fn() });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByText('Refund issue')).toBeOnTheScreen();
    expect(screen.getByText('On it')).toBeOnTheScreen();
  });

  it('shows the missing state', () => {
    mockedDetails.mockReturnValue({ ticket: null, isLoading: false, reply: jest.fn() });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-details-missing')).toBeOnTheScreen();
  });

  it('sends a reply (empty input is a no-op) and surfaces failures', async () => {
    const reply = jest.fn().mockResolvedValue(undefined);
    mockedDetails.mockReturnValue({ ticket, isLoading: false, reply });
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
});
