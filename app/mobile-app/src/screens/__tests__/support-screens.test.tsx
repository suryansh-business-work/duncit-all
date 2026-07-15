import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SupportScreen } from '@/screens/SupportScreen';
import { SupportTicketsScreen } from '@/screens/SupportTicketsScreen';
import { createTicket, useTickets } from '@/hooks/useSupport';
import { useFaqs, useFaqSearch } from '@/hooks/useLibrary';
import { useMeStore } from '@/stores/me.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupport', () => ({ useTickets: jest.fn(), createTicket: jest.fn() }));
jest.mock('@/hooks/useLibrary', () => ({ useFaqs: jest.fn(), useFaqSearch: jest.fn() }));
const mockNavigate = jest.fn();
let mockRouteParams: { podId?: string; podTitle?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (cb: () => void) => cb(),
}));

const mockedCreate = createTicket as jest.Mock;
const mockedTickets = useTickets as jest.Mock;
const mockedFaqs = useFaqs as jest.Mock;
const mockedFaqSearch = useFaqSearch as jest.Mock;

const faq = (id: string) => ({ id, question: `Q${id}`, answer: `A${id}` });

// Covers the SupportTopics icon variants (image URL / emoji / fallback), the
// null super-category, and both singular/plural article counts.
const groups = [
  {
    super_category: { id: 's1', name: 'Bookings', icon: 'https://cdn/ic.png', slug: 'bookings' },
    faqs: [faq('a'), faq('b')],
  },
  {
    super_category: { id: 's2', name: 'Payments', icon: '💳', slug: 'payments' },
    faqs: [faq('c')],
  },
  { super_category: null, faqs: [faq('d')] },
];

beforeEach(() => {
  mockNavigate.mockClear();
  mockedCreate.mockReset();
  mockRouteParams = undefined;
  mockedTickets.mockReturnValue({ tickets: [], isLoading: false, reload: jest.fn() });
  mockedFaqs.mockReturnValue({ groups, isLoading: false, error: undefined });
  mockedFaqSearch.mockReturnValue({ results: [], isLoading: false, hasQuery: false });
  useMeStore.setState({ data: undefined });
});

describe('SupportScreen help center', () => {
  it('renders the FAQ-forward hub and navigates to every support tool', () => {
    renderWithProviders(<SupportScreen />);
    expect(screen.getByTestId('support-hero-title')).toBeOnTheScreen();
    // Top FAQ gradient cards + topics (image / emoji / fallback / null category).
    expect(screen.getByTestId('faq-card-a')).toBeOnTheScreen();
    expect(screen.getByTestId('support-topic-s1')).toBeOnTheScreen();
    expect(screen.getByTestId('support-topic-s2')).toBeOnTheScreen();
    expect(screen.getByTestId('support-topic-GENERIC')).toBeOnTheScreen();
    expect(screen.getByText('2 articles')).toBeOnTheScreen();
    // Both the emoji-icon topic and the null-category topic have one article.
    expect(screen.getAllByText('1 article')).toHaveLength(2);

    fireEvent.press(screen.getByTestId('support-topic-s1'));
    expect(mockNavigate).toHaveBeenCalledWith('Faqs');
    fireEvent.press(screen.getByTestId('support-start-chat'));
    expect(mockNavigate).toHaveBeenCalledWith('ChatWithUs');
    fireEvent.press(screen.getByTestId('support-more-sos'));
    expect(mockNavigate).toHaveBeenCalledWith('Sos');
    fireEvent.press(screen.getByTestId('support-more-callback'));
    expect(mockNavigate).toHaveBeenCalledWith('Callback');
    fireEvent.press(screen.getByTestId('support-more-tickets'));
    expect(mockNavigate).toHaveBeenCalledWith('SupportTickets');
    fireEvent.press(screen.getByTestId('support-more-all'));
    expect(mockNavigate).toHaveBeenCalledWith('AllSupportTickets');
    // Chat is the primary CTA, not a "More ways" card.
    expect(screen.queryByTestId('support-more-chat')).toBeNull();
  });

  it('opens a top FAQ card and starts a conversation from the answer', () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.press(screen.getByTestId('faq-card-a'));
    // The answer text is unique to the open sheet (the card only shows the question).
    expect(screen.getByText('Aa')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('support-faq-modal-chat'));
    expect(mockNavigate).toHaveBeenCalledWith('ChatWithUs');
    // Starting the chat closes the sheet.
    expect(screen.queryByTestId('support-faq-modal-close')).toBeNull();
  });

  it('closes the FAQ answer sheet via the close button', () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.press(screen.getByTestId('faq-card-b'));
    expect(screen.getByTestId('support-faq-modal-close')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('support-faq-modal-close'));
    expect(screen.queryByTestId('support-faq-modal-close')).toBeNull();
  });

  it('searches server-side: opens a result, clears the field, and hides the browse sections', () => {
    mockedFaqSearch.mockReturnValue({
      results: [faq('r1'), faq('r2')],
      isLoading: false,
      hasQuery: true,
    });
    renderWithProviders(<SupportScreen />);

    fireEvent.changeText(screen.getByTestId('support-search'), 'refund');
    expect(screen.getByTestId('support-search-r2')).toBeOnTheScreen();
    // While searching, the top FAQs + topics collapse (mirrors mWeb).
    expect(screen.queryByTestId('faq-card-a')).toBeNull();
    expect(screen.queryByTestId('support-topic-s1')).toBeNull();

    fireEvent.press(screen.getByTestId('support-search-r1'));
    expect(screen.getByTestId('support-faq-modal-close')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('support-faq-modal-close'));

    expect(screen.getByTestId('support-search-clear')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('support-search-clear'));
    expect(screen.getByTestId('support-search').props.value).toBe('');
  });

  it('shows the search loading and no-match states', () => {
    mockedFaqSearch.mockReturnValue({ results: [], isLoading: true, hasQuery: true });
    const { rerender } = renderWithProviders(<SupportScreen />);
    expect(screen.getByTestId('support-search-loading')).toBeOnTheScreen();

    mockedFaqSearch.mockReturnValue({ results: [], isLoading: false, hasQuery: true });
    rerender(<SupportScreen />);
    expect(screen.getByTestId('support-search-empty')).toBeOnTheScreen();
  });

  it('shows the loading skeleton, the error note, and empty browse sections', () => {
    mockedFaqs.mockReturnValue({ groups: [], isLoading: true, error: undefined });
    const { rerender } = renderWithProviders(<SupportScreen />);
    expect(screen.getByTestId('support-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('faq-card-a')).toBeNull();

    mockedFaqs.mockReturnValue({ groups: [], isLoading: false, error: new Error('boom') });
    rerender(<SupportScreen />);
    expect(screen.getByTestId('support-error')).toBeOnTheScreen();
    // Browse sections collapse when there are no groups (both empty branches).
    expect(screen.queryByTestId('faq-card-a')).toBeNull();
    expect(screen.queryByTestId('support-topic-s1')).toBeNull();
    // Start-a-conversation + more-ways stay available.
    expect(screen.getByTestId('support-start-chat')).toBeOnTheScreen();
  });
});

describe('SupportTicketsScreen', () => {
  it('opens straight onto the form with the subtitle and banners (BUG-05/09)', () => {
    renderWithProviders(<SupportTicketsScreen />);
    expect(screen.getByTestId('ticket-form')).toBeOnTheScreen();
    expect(screen.getByTestId('tickets-subtitle')).toBeOnTheScreen();
    expect(screen.getByTestId('tickets-help-banner')).toBeOnTheScreen();
    expect(screen.getByTestId('tickets-faq-banner')).toBeOnTheScreen();
    expect(screen.getByText('Send to support')).toBeOnTheScreen();
  });

  it('the FAQ banner jumps to FAQs', () => {
    renderWithProviders(<SupportTicketsScreen />);
    fireEvent.press(screen.getByTestId('tickets-faq-banner'));
    expect(mockNavigate).toHaveBeenCalledWith('Faqs');
  });

  it('auto-fills name and email from the signed-in user (BUG-07)', () => {
    useMeStore.setState({
      data: { me: { full_name: 'Asha Rao', email: 'asha@duncit.com' } } as never,
    });
    renderWithProviders(<SupportTicketsScreen />);
    expect(screen.getByTestId('ticket-name').props.value).toBe('Asha Rao');
    expect(screen.getByTestId('ticket-email').props.value).toBe('asha@duncit.com');
  });

  it('navigates to the new ticket details after creating one', async () => {
    mockedCreate.mockResolvedValue('tk1');
    renderWithProviders(<SupportTicketsScreen />);
    fireEvent.changeText(screen.getByTestId('ticket-subject'), 'Help');
    fireEvent.changeText(screen.getByTestId('ticket-message'), 'It broke');
    fireEvent.press(screen.getByTestId('ticket-submit'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('TicketDetails', { ticketId: 'tk1' }),
    );
  });

  it('attaches the pod from route params: chip shown + pod sent on create', async () => {
    mockRouteParams = { podId: 'p1', podTitle: 'Sunset Jam' };
    mockedCreate.mockResolvedValue('tk2');
    renderWithProviders(<SupportTicketsScreen />);
    expect(screen.getByTestId('ticket-attached-pod')).toBeOnTheScreen();
    expect(screen.getByText('About pod: Sunset Jam')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('ticket-subject'), 'Help');
    fireEvent.changeText(screen.getByTestId('ticket-message'), 'About this pod');
    fireEvent.press(screen.getByTestId('ticket-submit'));
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith('Help', 'About this pod', expect.any(String), [], {
        id: 'p1',
        title: 'Sunset Jam',
      }),
    );
  });
});
