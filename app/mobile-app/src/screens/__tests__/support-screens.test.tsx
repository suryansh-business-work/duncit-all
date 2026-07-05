import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SupportScreen } from '@/screens/SupportScreen';
import { SupportTicketsScreen } from '@/screens/SupportTicketsScreen';
import { createTicket, useTickets } from '@/hooks/useSupport';
import { useMeStore } from '@/stores/me.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupport', () => ({ useTickets: jest.fn(), createTicket: jest.fn() }));
const mockNavigate = jest.fn();
let mockRouteParams: { podId?: string; podTitle?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockedCreate = createTicket as jest.Mock;
const mockedTickets = useTickets as jest.Mock;
beforeEach(() => {
  mockNavigate.mockClear();
  mockedCreate.mockReset();
  mockRouteParams = undefined;
  mockedTickets.mockReturnValue({ tickets: [], isLoading: false, reload: jest.fn() });
  useMeStore.setState({ data: undefined });
});

describe('SupportScreen', () => {
  it('navigates to every support tool from the hub (mWeb items + order)', () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.press(screen.getByTestId('support-sos'));
    expect(mockNavigate).toHaveBeenCalledWith('Sos');
    fireEvent.press(screen.getByTestId('support-callback'));
    expect(mockNavigate).toHaveBeenCalledWith('Callback');
    fireEvent.press(screen.getByTestId('support-tickets'));
    expect(mockNavigate).toHaveBeenCalledWith('SupportTickets');
    fireEvent.press(screen.getByTestId('support-chat'));
    expect(mockNavigate).toHaveBeenCalledWith('ChatWithUs');
    fireEvent.press(screen.getByTestId('support-all'));
    expect(mockNavigate).toHaveBeenCalledWith('AllSupportTickets');
    // FAQs + Policies are NOT on the support hub (they live in the account
    // drawer, like mWeb).
    expect(screen.queryByTestId('support-faqs')).toBeNull();
    expect(screen.queryByTestId('support-policies')).toBeNull();
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
