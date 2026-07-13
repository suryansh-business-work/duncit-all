import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { ChatWithUsScreen } from '@/screens/ChatWithUsScreen';
import { LiveChatScreen } from '@/screens/LiveChatScreen';
import { AllSupportTicketsScreen } from '@/screens/AllSupportTicketsScreen';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useTickets } from '@/hooks/useSupport';
import { useUnifiedTickets } from '@/hooks/useUnifiedTickets';
import { shareTranscript } from '@/utils/transcript';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupportChat');
jest.mock('@/hooks/useSupport', () => ({ useTickets: jest.fn() }));
jest.mock('@/hooks/useUnifiedTickets', () => ({ useUnifiedTickets: jest.fn() }));
jest.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({ dateFormat: 'dd MMM yyyy', timeFormat: 'HH:mm', timeZone: 'UTC' }),
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
const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const pickDoc = DocumentPicker.getDocumentAsync as jest.Mock;
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

const FUTURE_DEADLINE = '2999-01-01T00:00:00Z';
const PAST_DEADLINE = '2000-01-01T00:00:00Z';

const session = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  ticket_no: 'CH-AAA111',
  status: 'OPEN',
  agent_id: null,
  ai_active: true,
  agent_last_read_at: null,
  resolved_at: null,
  reopen_deadline: null,
  rating: null,
  feedback_comment: null,
  ...over,
});

const chatBase = () => ({
  session: session(),
  messages: [],
  isLoading: false,
  error: '',
  typing: '',
  aiThinking: false,
  send: jest.fn().mockResolvedValue(undefined),
  retry: jest.fn().mockResolvedValue(undefined),
  uploadAttachment: jest.fn().mockResolvedValue('https://img/up.jpg'),
  emitTyping: jest.fn(),
  resolve: jest.fn().mockResolvedValue(undefined),
  reopen: jest.fn().mockResolvedValue(undefined),
  submitFeedback: jest.fn().mockResolvedValue(undefined),
  getTranscript: jest
    .fn()
    .mockResolvedValue({ filename: 'support-CH.txt', text: 'log', content_base64: 'bG9n' }),
  emailTranscript: jest.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedChat.mockReturnValue(chatBase());
  mockedTickets.mockReturnValue({ tickets: [], isLoading: false, reload: jest.fn() });
});

describe('ChatWithUsScreen', () => {
  it('shows only the live-chat shortcut (no New button, no ticket list) and routes to LiveChat', () => {
    renderWithProviders(<ChatWithUsScreen />);
    expect(screen.getByTestId('chat-inbox-subtitle')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-live-card')).toBeOnTheScreen();
    // The "+ New" button and the ticket inbox list were removed.
    expect(screen.queryByTestId('chat-inbox-new')).toBeNull();
    expect(screen.queryByTestId('chat-inbox-empty')).toBeNull();
    expect(screen.queryByTestId('chat-inbox-ticket-t1')).toBeNull();

    fireEvent.press(screen.getByTestId('chat-live-card'));
    expect(mockNavigate).toHaveBeenCalledWith('LiveChat');
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
      typing: 'Support is typing…',
      messages: [
        chatMsg('1', 'USER', { created_at: '2000-01-01T10:00:00Z' }),
        chatMsg('2', 'SYSTEM', { text: 'Support executive Agent A will be assisting you now.' }),
        chatMsg('3', 'AGENT', {
          is_ai: true,
          attachments: ['https://img/a.jpg', 'https://x/doc.pdf'],
        }),
      ],
    });
    renderWithProviders(<LiveChatScreen />);
    expect(
      screen.getByText('Support executive Agent A will be assisting you now.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Duncit Assistant')).toBeOnTheScreen();
    expect(screen.getByTestId('tick-1')).toBeOnTheScreen();
    expect(screen.getByTestId('day-1')).toBeOnTheScreen();
    expect(screen.getByTestId('support-typing')).toHaveTextContent('Support is typing…');
    // Non-image attachment opens via the file chip.
    fireEvent.press(screen.getByTestId('support-attach-https://x/doc.pdf'));
  });

  it('shows the AI thinking indicator while the bot replies', () => {
    mockedChat.mockReturnValue({ ...chatBase(), aiThinking: true });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('support-typing')).toHaveTextContent('Duncit Assistant is typing…');
  });

  it('shows a delivered tick when the agent has not read yet', () => {
    mockedChat.mockReturnValue({ ...chatBase(), messages: [chatMsg('1', 'USER')] });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('tick-1')).toBeOnTheScreen();
  });

  it('shows a failed message with a Retry affordance and re-sends it', () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    const failed = chatMsg('1', 'USER', { failed: true });
    mockedChat.mockReturnValue({ ...chatBase(), retry, messages: [failed] });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByText('Failed · Retry')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('retry-1'));
    expect(retry).toHaveBeenCalledWith(failed);
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

  it('does not stage without photo permission or on cancel', async () => {
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/up.jpg');
    mockedChat.mockReturnValue({ ...chatBase(), uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValueOnce({ granted: false });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent(/photo access/i),
    );
    expect(uploadAttachment).not.toHaveBeenCalled();

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: true });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() => expect(uploadAttachment).not.toHaveBeenCalled());
    expect(screen.queryByTestId('support-chat-attach-preview-0')).toBeNull();
  });

  it('stages a picked image as a preview, then sends it with the text and clears', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/photo.jpg');
    mockedChat.mockReturnValue({ ...chatBase(), send, uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    // Attaching now stages a removable preview instead of sending immediately.
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-attach-preview-0')).toBeOnTheScreen(),
    );
    expect(send).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('support-chat-input'), 'here you go');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith('here you go', ['https://img/photo.jpg']),
    );
    // The staged preview clears once the message is sent.
    await waitFor(() => expect(screen.queryByTestId('support-chat-attach-preview-0')).toBeNull());
  });

  it('removes a staged attachment before sending', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/photo.jpg');
    mockedChat.mockReturnValue({ ...chatBase(), send, uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-attach-remove-0')).toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId('support-chat-attach-remove-0'));
    await waitFor(() => expect(screen.queryByTestId('support-chat-attach-preview-0')).toBeNull());

    // With nothing staged and no text, send stays a no-op.
    fireEvent.press(screen.getByTestId('support-chat-send'));
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a staged attachment on its own (empty text)', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/only.jpg');
    mockedChat.mockReturnValue({ ...chatBase(), send, uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://only.jpg' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-attach-preview-0')).toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId('support-chat-send'));
    await waitFor(() => expect(send).toHaveBeenCalledWith('', ['https://img/only.jpg']));
  });

  it('surfaces an attachment upload failure and stages nothing', async () => {
    const uploadAttachment = jest.fn().mockRejectedValue(new Error('upload failed'));
    mockedChat.mockReturnValue({ ...chatBase(), uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://x.jpg' }] });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent('upload failed'),
    );
    expect(screen.queryByTestId('support-chat-attach-preview-0')).toBeNull();
  });

  it('stages a document: cancel then success (Bug 9)', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/spec.pdf');
    mockedChat.mockReturnValue({ ...chatBase(), send, uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    pickDoc.mockResolvedValueOnce({ canceled: true, assets: null });
    fireEvent.press(screen.getByTestId('support-chat-attach-doc'));
    await waitFor(() => expect(pickDoc).toHaveBeenCalled());
    expect(uploadAttachment).not.toHaveBeenCalled();

    pickDoc.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://spec.pdf', name: 'spec.pdf', mimeType: 'application/pdf' }],
    });
    fireEvent.press(screen.getByTestId('support-chat-attach-doc'));
    await waitFor(() =>
      expect(uploadAttachment).toHaveBeenCalledWith({
        uri: 'file://spec.pdf',
        fileName: 'spec.pdf',
        mimeType: 'application/pdf',
      }),
    );
    // The document is staged (previewed), not sent immediately.
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-attach-preview-0')).toBeOnTheScreen(),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects an over-size image or document (100 MB cap)', async () => {
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/up.jpg');
    mockedChat.mockReturnValue({ ...chatBase(), uploadAttachment });
    renderWithProviders(<LiveChatScreen />);
    const tooBig = 101 * 1024 * 1024;

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({
      canceled: false,
      assets: [{ base64: 'abc', fileSize: tooBig }],
    });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent(/max 100 MB/i),
    );
    expect(uploadAttachment).not.toHaveBeenCalled();

    pickDoc.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file://big.pdf', name: 'big.pdf', mimeType: 'application/pdf', size: tooBig },
      ],
    });
    fireEvent.press(screen.getByTestId('support-chat-attach-doc'));
    await waitFor(() => expect(pickDoc).toHaveBeenCalled());
    expect(uploadAttachment).not.toHaveBeenCalled();
  });

  it('rejects a video over the 50 MB cap', async () => {
    const uploadAttachment = jest.fn().mockResolvedValue('https://img/clip.mp4');
    mockedChat.mockReturnValue({ ...chatBase(), uploadAttachment });
    renderWithProviders(<LiveChatScreen />);

    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValueOnce({
      canceled: false,
      assets: [{ base64: 'abc', type: 'video', fileSize: 51 * 1024 * 1024 }],
    });
    fireEvent.press(screen.getByTestId('support-chat-attach'));
    await waitFor(() =>
      expect(screen.getByTestId('support-chat-send-error')).toHaveTextContent(
        'Video is too large (max 50 MB).',
      ),
    );
    expect(uploadAttachment).not.toHaveBeenCalled();
  });
});

describe('LiveChatScreen — resolve + feedback (B7/B8)', () => {
  it('confirms before resolving, then submits emoji feedback', async () => {
    const resolve = jest.fn().mockResolvedValue(undefined);
    const submitFeedback = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase(), resolve, submitFeedback });
    renderWithProviders(<LiveChatScreen />);

    // Toggle opens the confirm modal — resolve only runs after "Yes".
    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    expect(screen.getByTestId('resolve-confirm-modal')).toBeOnTheScreen();
    expect(resolve).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('resolve-confirm-yes'));
    await waitFor(() => expect(resolve).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('support-feedback-modal')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('feedback-emoji-4'));
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith(4, ''));
    await waitFor(() => expect(screen.getByTestId('feedback-thanks')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('feedback-done'));
    expect(screen.queryByTestId('support-feedback-modal')).toBeNull();
  });

  it('cancels the resolve confirmation', () => {
    const resolve = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({ ...chatBase(), resolve });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    fireEvent.press(screen.getByTestId('resolve-confirm-cancel'));
    expect(screen.queryByTestId('resolve-confirm-modal')).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('surfaces a feedback submit failure', async () => {
    const submitFeedback = jest.fn().mockRejectedValue(new Error('already submitted'));
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({ status: 'CLOSED', resolved_at: PAST_DEADLINE }),
      submitFeedback,
    });
    renderWithProviders(<LiveChatScreen />);
    // Auto-opens for a resolved, unrated chat.
    await waitFor(() => expect(screen.getByTestId('support-feedback-modal')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('feedback-emoji-2'));
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('feedback-error')).toHaveTextContent('already submitted'),
    );
  });

  it('locks the composer and shows the resolved note once closed', () => {
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({
        status: 'CLOSED',
        resolved_at: PAST_DEADLINE,
        reopen_deadline: FUTURE_DEADLINE,
        rating: 5,
      }),
    });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('chat-closed-note')).toHaveTextContent(
      'This conversation has been marked as resolved.',
    );
    // Composer is locked (input hidden).
    expect(screen.queryByTestId('support-chat-input')).toBeNull();
  });

  it('does not auto-open feedback for an already-rated resolved chat (one-time)', () => {
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({
        status: 'CLOSED',
        resolved_at: PAST_DEADLINE,
        reopen_deadline: FUTURE_DEADLINE,
        rating: 3,
        feedback_comment: 'It was ok',
      }),
    });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.queryByTestId('support-feedback-modal')).toBeNull();
  });
});

describe('LiveChatScreen — reopen + transcript', () => {
  it('re-opens a closed chat via the reason modal and shows the deadline', async () => {
    const reopen = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({
        status: 'CLOSED',
        resolved_at: PAST_DEADLINE,
        reopen_deadline: FUTURE_DEADLINE,
        rating: 5,
      }),
      reopen,
    });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.getByTestId('chat-reopen-deadline')).toHaveTextContent(/You can reopen until/);

    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    fireEvent.changeText(screen.getByTestId('reopen-reason-input'), 'Need more help');
    fireEvent.press(screen.getByTestId('reopen-submit'));
    await waitFor(() => expect(reopen).toHaveBeenCalledWith('Need more help'));
    await waitFor(() => expect(screen.queryByTestId('reopen-reason-modal')).toBeNull());
  });

  it('re-opens with no reason (optional, B11)', async () => {
    const reopen = jest.fn().mockResolvedValue(undefined);
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({
        status: 'CLOSED',
        resolved_at: PAST_DEADLINE,
        reopen_deadline: FUTURE_DEADLINE,
        rating: 5,
      }),
      reopen,
    });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    fireEvent.press(screen.getByTestId('reopen-submit'));
    await waitFor(() => expect(reopen).toHaveBeenCalledWith(''));
  });

  it('surfaces a chat reopen failure in the modal', async () => {
    const reopen = jest.fn().mockRejectedValue(new Error('window closed'));
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({
        status: 'CLOSED',
        resolved_at: PAST_DEADLINE,
        reopen_deadline: FUTURE_DEADLINE,
        rating: 5,
      }),
      reopen,
    });
    renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-toggle'));
    fireEvent.changeText(screen.getByTestId('reopen-reason-input'), 'please');
    fireEvent.press(screen.getByTestId('reopen-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('reopen-error')).toHaveTextContent('window closed'),
    );
    fireEvent.press(screen.getByTestId('reopen-cancel'));
    expect(screen.queryByTestId('reopen-reason-modal')).toBeNull();
  });

  it('hides the toggle and shows the expired note once the chat reopen window passes', () => {
    mockedChat.mockReturnValue({
      ...chatBase(),
      session: session({
        status: 'CLOSED',
        resolved_at: PAST_DEADLINE,
        reopen_deadline: PAST_DEADLINE,
        rating: 5,
      }),
    });
    renderWithProviders(<LiveChatScreen />);
    expect(screen.queryByTestId('chat-action-toggle')).toBeNull();
    expect(screen.getByTestId('chat-closed-note')).toHaveTextContent(/re-open window has passed/i);
    expect(screen.queryByTestId('chat-reopen-deadline')).toBeNull();
  });

  it('downloads the .txt and .docx transcripts, and skips when none', async () => {
    const getTranscript = jest
      .fn()
      .mockResolvedValue({ filename: 'f.txt', text: 'log', content_base64: 'bG9n' });
    mockedChat.mockReturnValue({ ...chatBase(), getTranscript });
    const a = renderWithProviders(<LiveChatScreen />);
    fireEvent.press(screen.getByTestId('chat-action-download'));
    await waitFor(() =>
      expect(mockShare).toHaveBeenCalledWith({
        filename: 'f.txt',
        text: 'log',
        content_base64: 'bG9n',
      }),
    );
    fireEvent.press(screen.getByTestId('chat-action-download-docx'));
    await waitFor(() => expect(getTranscript).toHaveBeenCalledTimes(2));
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
    const jump = screen.getByTestId('chat-jump-bottom');
    expect(jump).toBeOnTheScreen();
    fireEvent.press(jump);
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
