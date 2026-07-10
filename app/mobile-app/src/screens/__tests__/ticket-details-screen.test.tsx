import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { TicketDetailsScreen } from '@/screens/TicketDetailsScreen';
import { useTicketDetails } from '@/hooks/useUnifiedTickets';
import { useSupportUpload } from '@/hooks/useSupportUpload';
import { shareTranscript } from '@/utils/transcript';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useUnifiedTickets', () => ({ useTicketDetails: jest.fn() }));
jest.mock('@/hooks/useSupportUpload', () => ({ useSupportUpload: jest.fn() }));
jest.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({ dateFormat: 'dd MMM yyyy', timeFormat: 'HH:mm', timeZone: 'UTC' }),
}));
jest.mock('@/utils/transcript', () => ({
  shareTranscript: jest.fn().mockResolvedValue(undefined),
}));
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack }),
  useRoute: () => ({ params: { ticketId: 't1' } }),
}));

const mockedDetails = useTicketDetails as jest.Mock;
const mockedUpload = useSupportUpload as jest.Mock;
const pickAndUpload = jest.fn();
const mockShare = shareTranscript as jest.Mock;

const FUTURE = '2999-01-01T00:00:00Z';
const PAST = '2000-01-01T00:00:00Z';

const baseHandlers = () => ({
  reply: jest.fn().mockResolvedValue(undefined),
  reopen: jest.fn().mockResolvedValue(undefined),
  resolve: jest.fn().mockResolvedValue(undefined),
  submitFeedback: jest.fn().mockResolvedValue(undefined),
  getTranscript: jest
    .fn()
    .mockResolvedValue({ filename: 't.txt', text: 'log', content_base64: 'bG9n' }),
  emailTranscript: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn(),
});

const detail = (status: string, over: Record<string, unknown> = {}) => ({
  id: 't1',
  subject: 'Refund issue',
  category: 'PAYMENT',
  status,
  priority: 'HIGH',
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-02T10:00:00Z',
  last_message_at: '2026-06-02T10:00:00Z',
  resolved_at: null,
  reopen_deadline: null,
  rating: null,
  feedback_comment: null,
  ...over,
  messages: [
    {
      id: 'm1',
      author_role: 'USER',
      author_name: 'Me',
      body_text: 'Please refund',
      attachments: [],
      created_at: '2026-06-01T10:05:00Z',
    },
    {
      id: 'm2',
      author_role: 'AGENT',
      author_name: 'Agent A',
      body_text: 'On it',
      attachments: [],
      created_at: '2026-06-02T11:00:00Z',
    },
    {
      id: 'm3',
      author_role: 'SYSTEM',
      author_name: 'System',
      body_text: 'Ticket marked resolved by Me.',
      attachments: [],
      created_at: '2026-06-02T12:00:00Z',
    },
    {
      id: 'm4',
      author_role: 'USER',
      author_name: 'Me',
      body_text: '',
      attachments: ['https://ik/support/spec.pdf'],
      created_at: '2026-06-02T12:05:00Z',
    },
  ],
});

const mount = (status: string, over: Record<string, unknown> = {}, handlers = baseHandlers()) => {
  mockedDetails.mockReturnValue({ ticket: detail(status, over), isLoading: false, ...handlers });
  return handlers;
};

beforeEach(() => {
  jest.clearAllMocks();
  pickAndUpload.mockReset();
  mockedUpload.mockReturnValue({ uploading: false, error: '', pickAndUpload });
});

describe('TicketDetailsScreen — states + thread', () => {
  it('shows loading, then the missing state', () => {
    mockedDetails.mockReturnValue({ ticket: null, isLoading: true, ...baseHandlers() });
    const a = renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-details-loading')).toBeOnTheScreen();
    a.unmount();

    mockedDetails.mockReturnValue({ ticket: null, isLoading: false, ...baseHandlers() });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-details-missing')).toBeOnTheScreen();
  });

  it('renders USER/AGENT bubbles, a SYSTEM timeline line and a day separator (B7/B10)', () => {
    mount('OPEN');
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByText('On it')).toBeOnTheScreen();
    expect(screen.getByText('Ticket marked resolved by Me.')).toBeOnTheScreen();
    expect(screen.getByTestId('ticket-day-m1')).toBeOnTheScreen();
    expect(screen.getByTestId('ticket-day-m2')).toBeOnTheScreen();
    expect(screen.getByTestId('ticket-meta-no')).toHaveTextContent(/^ST-/);
    expect(screen.getByTestId('ticket-meta-priority')).toHaveTextContent('HIGH');
  });

  it('falls back to last_message_at when updated_at is absent', () => {
    mount('OPEN', { updated_at: null });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByText(/Last updated:/)).toBeOnTheScreen();
  });

  it('shows the jump-to-latest button after scrolling up', () => {
    mount('OPEN');
    renderWithProviders(<TicketDetailsScreen />);
    const scroller = screen.getByTestId('ticket-msg-m1').parent!;
    fireEvent.scroll(scroller, {
      nativeEvent: {
        contentOffset: { y: 0 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 300 },
      },
    });
    fireEvent.press(screen.getByTestId('ticket-jump-bottom'));
  });
});

describe('TicketDetailsScreen — reply (B7 lock)', () => {
  it('sends a reply (empty is a no-op) and surfaces failures', async () => {
    const h = mount('OPEN');
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    expect(h.reply).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId('ticket-reply-input'), 'thanks');
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    await waitFor(() => expect(h.reply).toHaveBeenCalledWith('thanks', []));

    h.reply.mockRejectedValueOnce(new Error('server busy'));
    fireEvent.changeText(screen.getByTestId('ticket-reply-input'), 'again');
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    await waitFor(() =>
      expect(screen.getByTestId('ticket-reply-error')).toHaveTextContent('server busy'),
    );
  });

  it('locks the reply (shows the resolved note) once resolved', () => {
    mount('RESOLVED', { resolved_at: PAST, reopen_deadline: FUTURE, rating: 4 });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-resolved-note')).toBeOnTheScreen();
    expect(screen.queryByTestId('ticket-reply-input')).toBeNull();
  });

  it('renders an attachment-only reply as a file card in the thread', () => {
    mount('OPEN');
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('support-attach-https://ik/support/spec.pdf')).toBeOnTheScreen();
  });

  it('attaches a file and sends it with the reply', async () => {
    const h = mount('OPEN');
    pickAndUpload.mockResolvedValue('https://ik/support/proof.png');
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    await waitFor(() => expect(screen.getByTestId('ticket-attach-0')).toBeOnTheScreen());
    fireEvent.changeText(screen.getByTestId('ticket-reply-input'), 'here you go');
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    await waitFor(() =>
      expect(h.reply).toHaveBeenCalledWith('here you go', ['https://ik/support/proof.png']),
    );
  });

  it('sends an attachment-only reply (no text)', async () => {
    const h = mount('OPEN');
    pickAndUpload.mockResolvedValue('https://ik/support/only.png');
    renderWithProviders(<TicketDetailsScreen />);
    // Empty + no attachments is a no-op.
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    expect(h.reply).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    await waitFor(() => expect(screen.getByTestId('ticket-attach-0')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('ticket-reply-send'));
    await waitFor(() => expect(h.reply).toHaveBeenCalledWith('', ['https://ik/support/only.png']));
    // Preview clears once the reply is sent.
    await waitFor(() => expect(screen.queryByTestId('ticket-attach-0')).toBeNull());
  });
});

describe('TicketDetailsScreen — resolve + feedback (B7/B8)', () => {
  it('confirms before resolving, then submits emoji feedback', async () => {
    const h = mount('OPEN');
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-action-resolve'));
    expect(screen.getByTestId('resolve-confirm-modal')).toBeOnTheScreen();
    expect(h.resolve).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('resolve-confirm-yes'));
    await waitFor(() => expect(h.resolve).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('support-feedback-modal')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('feedback-emoji-5'));
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() => expect(h.submitFeedback).toHaveBeenCalledWith(5, ''));
    await waitFor(() => expect(screen.getByTestId('feedback-thanks')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('feedback-done'));
  });

  it('cancels the resolve confirmation', () => {
    const h = mount('OPEN');
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-action-resolve'));
    fireEvent.press(screen.getByTestId('resolve-confirm-cancel'));
    expect(screen.queryByTestId('resolve-confirm-modal')).toBeNull();
    expect(h.resolve).not.toHaveBeenCalled();
  });

  it('auto-opens feedback for a resolved unrated ticket and surfaces a submit failure', async () => {
    const h = mount('RESOLVED', { resolved_at: PAST, reopen_deadline: FUTURE });
    h.submitFeedback.mockRejectedValueOnce(new Error('already submitted'));
    renderWithProviders(<TicketDetailsScreen />);
    await waitFor(() => expect(screen.getByTestId('support-feedback-modal')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('feedback-emoji-2'));
    fireEvent.press(screen.getByTestId('feedback-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('feedback-error')).toHaveTextContent('already submitted'),
    );
    // Skip closes the form.
    fireEvent.press(screen.getByTestId('feedback-skip'));
    expect(screen.queryByTestId('support-feedback-modal')).toBeNull();
  });

  it('does not auto-open feedback for an already-rated ticket (one-time)', () => {
    mount('CLOSED', {
      resolved_at: PAST,
      reopen_deadline: PAST,
      rating: 1,
      feedback_comment: 'Bad',
    });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.queryByTestId('support-feedback-modal')).toBeNull();
  });

  it('hides resolve once the ticket is resolved', () => {
    mount('RESOLVED', { resolved_at: PAST, reopen_deadline: FUTURE, rating: 4 });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.queryByTestId('ticket-action-resolve')).toBeNull();
  });
});

describe('TicketDetailsScreen — reopen (B11) + transcript (B15)', () => {
  it('re-opens with an optional reason, then surfaces a failure', async () => {
    const h = mount('RESOLVED', { resolved_at: PAST, reopen_deadline: FUTURE, rating: 4 });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.getByTestId('ticket-reopen-until')).toHaveTextContent(/You can reopen until/);

    fireEvent.press(screen.getByTestId('ticket-reopen'));
    // Reason is optional — submit with an empty field.
    fireEvent.press(screen.getByTestId('reopen-submit'));
    await waitFor(() => expect(h.reopen).toHaveBeenCalledWith(''));
    await waitFor(() => expect(screen.queryByTestId('reopen-reason-modal')).toBeNull());

    h.reopen.mockRejectedValueOnce(new Error('cannot reopen'));
    fireEvent.press(screen.getByTestId('ticket-reopen'));
    fireEvent.changeText(screen.getByTestId('reopen-reason-input'), 'again');
    fireEvent.press(screen.getByTestId('reopen-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('reopen-error')).toHaveTextContent('cannot reopen'),
    );
    fireEvent.press(screen.getByTestId('reopen-cancel'));
    expect(screen.queryByTestId('reopen-reason-modal')).toBeNull();
  });

  it('shows the expired note once the window has passed', () => {
    mount('CLOSED', { resolved_at: PAST, reopen_deadline: PAST, rating: 4 });
    renderWithProviders(<TicketDetailsScreen />);
    expect(screen.queryByTestId('ticket-reopen')).toBeNull();
    expect(screen.getByTestId('ticket-reopen-expired')).toBeOnTheScreen();
  });

  it('downloads the .txt and .docx transcripts and skips when none', async () => {
    const h = mount('OPEN');
    const a = renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-action-download'));
    await waitFor(() =>
      expect(mockShare).toHaveBeenCalledWith({
        filename: 't.txt',
        text: 'log',
        content_base64: 'bG9n',
      }),
    );
    fireEvent.press(screen.getByTestId('ticket-action-download-docx'));
    await waitFor(() => expect(h.getTranscript).toHaveBeenCalledTimes(2));
    a.unmount();

    mockShare.mockClear();
    mount('OPEN', {}, { ...baseHandlers(), getTranscript: jest.fn().mockResolvedValue(null) });
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-action-download'));
    await waitFor(() => expect(mockShare).not.toHaveBeenCalled());
  });

  it('emails the transcript (success then failure)', async () => {
    const h = mount('OPEN');
    renderWithProviders(<TicketDetailsScreen />);
    fireEvent.press(screen.getByTestId('ticket-action-email'));
    fireEvent.changeText(screen.getByTestId('email-input'), 'me@x.com');
    fireEvent.press(screen.getByTestId('email-send'));
    await waitFor(() => expect(h.emailTranscript).toHaveBeenCalledWith('me@x.com'));
    await waitFor(() => expect(screen.getByTestId('email-done')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('email-close'));

    h.emailTranscript.mockRejectedValueOnce(new Error('mail down'));
    fireEvent.press(screen.getByTestId('ticket-action-email'));
    fireEvent.changeText(screen.getByTestId('email-input'), 'me@x.com');
    fireEvent.press(screen.getByTestId('email-send'));
    await waitFor(() => expect(screen.getByTestId('email-error')).toHaveTextContent('mail down'));
  });
});
