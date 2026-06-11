import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SupportScreen } from '@/screens/SupportScreen';
import { SupportTicketsScreen } from '@/screens/SupportTicketsScreen';
import { useTickets } from '@/hooks/useSupport';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupport', () => ({ useTickets: jest.fn(), createTicket: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedTickets = useTickets as jest.Mock;
beforeEach(() => mockNavigate.mockClear());

describe('SupportScreen', () => {
  it('navigates to every support tool from the hub', () => {
    renderWithProviders(<SupportScreen />);
    fireEvent.press(screen.getByTestId('support-sos'));
    expect(mockNavigate).toHaveBeenCalledWith('Sos');
    fireEvent.press(screen.getByTestId('support-callback'));
    expect(mockNavigate).toHaveBeenCalledWith('Callback');
    fireEvent.press(screen.getByTestId('support-chat'));
    expect(mockNavigate).toHaveBeenCalledWith('ChatWithUs');
    fireEvent.press(screen.getByTestId('support-tickets'));
    expect(mockNavigate).toHaveBeenCalledWith('SupportTickets');
    fireEvent.press(screen.getByTestId('support-all'));
    expect(mockNavigate).toHaveBeenCalledWith('AllSupportTickets');
    fireEvent.press(screen.getByTestId('support-faqs'));
    expect(mockNavigate).toHaveBeenCalledWith('Faqs');
    fireEvent.press(screen.getByTestId('support-policies'));
    expect(mockNavigate).toHaveBeenCalledWith('Policies');
  });
});

describe('SupportTicketsScreen', () => {
  const ticket = {
    id: 't1',
    subject: 'Help',
    category: 'GENERAL',
    status: 'OPEN',
    priority: 'LOW',
    message_count: 1,
    last_message_at: '',
    created_at: '',
  };

  it('renders tickets and toggles the create form', () => {
    mockedTickets.mockReturnValue({ tickets: [ticket], isLoading: false, reload: jest.fn() });
    renderWithProviders(<SupportTicketsScreen />);
    expect(screen.getByTestId('ticket-t1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ticket-toggle'));
    expect(screen.getByTestId('ticket-form')).toBeOnTheScreen();
  });

  it('hides the form and reloads after creating a ticket', async () => {
    const reload = jest.fn();
    mockedTickets.mockReturnValue({ tickets: [], isLoading: false, reload });
    renderWithProviders(<SupportTicketsScreen />);
    fireEvent.press(screen.getByTestId('ticket-toggle'));
    fireEvent.changeText(screen.getByTestId('ticket-subject'), 'Help');
    fireEvent.changeText(screen.getByTestId('ticket-message'), 'It broke');
    fireEvent.press(screen.getByTestId('ticket-submit'));
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(screen.queryByTestId('ticket-form')).toBeNull();
  });

  it('shows empty and loading states', () => {
    mockedTickets.mockReturnValue({ tickets: [], isLoading: false, reload: jest.fn() });
    const { rerender } = renderWithProviders(<SupportTicketsScreen />);
    expect(screen.getByTestId('tickets-empty')).toBeOnTheScreen();

    mockedTickets.mockReturnValue({ tickets: [], isLoading: true, reload: jest.fn() });
    rerender(<SupportTicketsScreen />);
    expect(screen.getByTestId('tickets-loading')).toBeOnTheScreen();
  });
});
