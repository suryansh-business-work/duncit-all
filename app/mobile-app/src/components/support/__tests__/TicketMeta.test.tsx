import { screen } from '@testing-library/react-native';

import { TicketMeta, ticketNo } from '@/components/support/TicketMeta';
import { renderWithProviders } from '@/utils/test-utils';

describe('ticketNo', () => {
  it('derives an ST- number from the last six id characters', () => {
    expect(ticketNo('abc123def456')).toBe('ST-DEF456');
  });
});

describe('TicketMeta', () => {
  it('renders the number, priority and both date rows', () => {
    renderWithProviders(
      <TicketMeta
        id="t1"
        status="OPEN"
        category="PAYMENT"
        priority="HIGH"
        createdAt="2026-06-01T10:00:00Z"
        updatedAt="2026-06-02T10:00:00Z"
      />,
    );
    expect(screen.getByTestId('ticket-meta-no')).toHaveTextContent(/^ST-/);
    expect(screen.getByTestId('ticket-meta-priority')).toHaveTextContent('HIGH');
    expect(screen.getByText(/^Raised:/)).toBeOnTheScreen();
    expect(screen.getByText(/^Last updated:/)).toBeOnTheScreen();
  });

  it('omits the priority and date rows when absent or unparseable', () => {
    renderWithProviders(
      <TicketMeta id="t1" status="OPEN" category="PAYMENT" createdAt="" updatedAt={null} />,
    );
    expect(screen.queryByTestId('ticket-meta-priority')).toBeNull();
    expect(screen.queryByText(/Raised:/)).toBeNull();
    expect(screen.queryByText(/Last updated:/)).toBeNull();
  });
});
