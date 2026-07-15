import { fireEvent, screen } from '@testing-library/react-native';

import { MyTicketsList } from '@/components/support/MyTicketsList';
import { useTickets } from '@/hooks/useSupport';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupport', () => ({ useTickets: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => cb(),
}));

const mockedTickets = useTickets as jest.Mock;

const ticket = (id: string, status: string, subject = 'Subject') => ({
  id,
  subject,
  category: 'PAYMENT',
  status,
  priority: 'LOW',
  message_count: 1,
  last_message_at: '',
  created_at: '',
});

beforeEach(() => jest.clearAllMocks());

describe('MyTicketsList', () => {
  it('shows the loading skeleton', () => {
    mockedTickets.mockReturnValue({ tickets: [], isLoading: true, reload: jest.fn() });
    renderWithProviders(<MyTicketsList />);
    expect(screen.getByTestId('my-tickets-loading')).toBeOnTheScreen();
  });

  it('shows an empty message when there are no tickets', () => {
    mockedTickets.mockReturnValue({ tickets: [], isLoading: false, reload: jest.fn() });
    renderWithProviders(<MyTicketsList />);
    expect(screen.getByTestId('my-tickets-empty')).toHaveTextContent(
      "You haven't raised any tickets yet.",
    );
  });

  it('lists tickets, filters by status and opens one', () => {
    mockedTickets.mockReturnValue({
      tickets: [
        ticket('t1', 'OPEN', 'Open one'),
        ticket('t2', 'CLOSED', 'Closed one'),
        ticket('t3', 'ARCHIVED', 'Odd one'),
      ],
      isLoading: false,
      reload: jest.fn(),
    });
    renderWithProviders(<MyTicketsList />);

    // All shows every ticket with ST- numbers; an unknown status shows raw.
    expect(screen.getByTestId('my-ticket-t1')).toBeOnTheScreen();
    expect(screen.getByTestId('my-ticket-t2')).toBeOnTheScreen();
    expect(screen.getByText('ARCHIVED')).toBeOnTheScreen();
    expect(screen.getAllByText(/ST-/).length).toBeGreaterThan(0);
    // Bug 4: each filter chip shows a count from the loaded tickets.
    expect(screen.getByTestId('tickets-filter-ALL')).toHaveTextContent('All (3)');
    expect(screen.getByTestId('tickets-filter-OPEN')).toHaveTextContent('Open (1)');
    expect(screen.getByTestId('tickets-filter-CLOSED')).toHaveTextContent('Closed (1)');
    expect(screen.getByTestId('tickets-filter-RESOLVED')).toHaveTextContent('Resolved (0)');

    // Filter to Resolved → none → per-filter empty message.
    fireEvent.press(screen.getByTestId('tickets-filter-RESOLVED'));
    expect(screen.getByTestId('my-tickets-empty')).toHaveTextContent('No resolved tickets.');

    // Filter to Closed → only t2.
    fireEvent.press(screen.getByTestId('tickets-filter-CLOSED'));
    expect(screen.queryByTestId('my-ticket-t1')).toBeNull();
    fireEvent.press(screen.getByTestId('my-ticket-t2'));
    expect(mockNavigate).toHaveBeenCalledWith('TicketDetails', { ticketId: 't2' });
  });
});
