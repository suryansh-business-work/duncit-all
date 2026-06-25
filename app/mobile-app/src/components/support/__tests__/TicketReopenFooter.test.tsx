import { fireEvent, screen } from '@testing-library/react-native';

import { TicketReopenFooter } from '@/components/support/TicketReopenFooter';
import { renderWithProviders } from '@/utils/test-utils';

describe('TicketReopenFooter', () => {
  it('shows the reopen button and deadline line, and fires onReopen', () => {
    const onReopen = jest.fn();
    renderWithProviders(
      <TicketReopenFooter
        reopenable
        expired={false}
        deadlineLabel="07 Jul 2026, 06:30 PM"
        onReopen={onReopen}
      />,
    );
    expect(screen.getByTestId('ticket-reopen-until')).toHaveTextContent(/You can reopen until/);
    fireEvent.press(screen.getByTestId('ticket-reopen'));
    expect(onReopen).toHaveBeenCalled();
  });

  it('hides the deadline line when no label is available', () => {
    renderWithProviders(
      <TicketReopenFooter reopenable expired={false} deadlineLabel="" onReopen={jest.fn()} />,
    );
    expect(screen.getByTestId('ticket-reopen')).toBeOnTheScreen();
    expect(screen.queryByTestId('ticket-reopen-until')).toBeNull();
  });

  it('shows the expired note when the window has passed', () => {
    renderWithProviders(
      <TicketReopenFooter reopenable={false} expired deadlineLabel="" onReopen={jest.fn()} />,
    );
    expect(screen.queryByTestId('ticket-reopen')).toBeNull();
    expect(screen.getByTestId('ticket-reopen-expired')).toBeOnTheScreen();
  });

  it('renders nothing for an open ticket', () => {
    renderWithProviders(
      <TicketReopenFooter
        reopenable={false}
        expired={false}
        deadlineLabel=""
        onReopen={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('ticket-reopen')).toBeNull();
    expect(screen.queryByTestId('ticket-reopen-expired')).toBeNull();
  });
});
