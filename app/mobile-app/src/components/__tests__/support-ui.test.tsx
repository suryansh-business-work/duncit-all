import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { TicketForm } from '@/components/support/TicketForm';
import { TicketRow } from '@/components/support/TicketRow';
import { createTicket } from '@/hooks/useSupport';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupport', () => ({ createTicket: jest.fn() }));
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack }),
}));

const mockedCreate = createTicket as jest.Mock;
beforeEach(() => {
  mockGoBack.mockClear();
  mockedCreate.mockReset();
});

describe('StackScreen', () => {
  it('renders the title and goes back', () => {
    renderWithProviders(
      <StackScreen title="My Page" testID="x">
        <Text>body</Text>
      </StackScreen>,
    );
    expect(screen.getByText('My Page')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('x-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('TicketRow', () => {
  it('renders the subject and status', () => {
    const ticket = {
      id: 't1',
      subject: 'Refund please',
      category: 'PAYMENT',
      status: 'OPEN',
      priority: 'LOW',
      message_count: 2,
      last_message_at: '',
      created_at: '',
    } as never;
    renderWithProviders(<TicketRow ticket={ticket} />);
    expect(screen.getByText('Refund please')).toBeOnTheScreen();
    expect(screen.getByText('OPEN')).toBeOnTheScreen();
  });

  it('handles an unknown status and a single message', () => {
    const ticket = {
      id: 't2',
      subject: 'Hi',
      category: 'GENERAL',
      status: 'ARCHIVED',
      priority: 'LOW',
      message_count: 1,
      last_message_at: '',
      created_at: '',
    } as never;
    renderWithProviders(<TicketRow ticket={ticket} />);
    expect(screen.getByText('GENERAL · 1 message')).toBeOnTheScreen();
  });
});

describe('TicketForm', () => {
  it('blocks submit without subject + message', async () => {
    renderWithProviders(<TicketForm onCreated={jest.fn()} />);
    fireEvent.press(screen.getByTestId('ticket-submit'));
    expect(await screen.findByTestId('ticket-error')).toBeOnTheScreen();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('creates a ticket when filled (friendly category mapped to server enum)', async () => {
    mockedCreate.mockResolvedValue(undefined);
    const onCreated = jest.fn();
    renderWithProviders(
      <TicketForm onCreated={onCreated} initialName="Asha" initialEmail="a@b.com" />,
    );
    fireEvent.changeText(screen.getByTestId('ticket-subject'), 'Sub');
    fireEvent.press(screen.getByTestId('ticket-category'));
    fireEvent.press(screen.getByTestId('ticket-category-option-BUG'));
    fireEvent.changeText(screen.getByTestId('ticket-message'), 'Body');
    fireEvent.press(screen.getByTestId('ticket-submit'));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    // BUG (friendly) → TECHNICAL (server enum); no attachments, no attached pod.
    expect(mockedCreate).toHaveBeenCalledWith('Sub', 'Body', 'TECHNICAL', [], undefined);
  });
});
