import { screen } from '@testing-library/react-native';

import { TicketMessageBubble } from '@/components/support/TicketMessageBubble';
import { renderWithProviders } from '@/utils/test-utils';

const msg = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  author_role: 'USER',
  author_name: 'Me',
  body_text: 'Hello',
  created_at: '2026-06-01T10:00:00Z',
  ...over,
});

describe('TicketMessageBubble', () => {
  it('renders a USER bubble with a zone-local time', () => {
    renderWithProviders(<TicketMessageBubble message={msg()} timeZone="UTC" />);
    expect(screen.getByText('Hello')).toBeOnTheScreen();
    expect(screen.getByText('10:00')).toBeOnTheScreen();
  });

  it('renders an AGENT bubble and omits the time when the stamp is missing', () => {
    renderWithProviders(
      <TicketMessageBubble
        message={msg({ author_role: 'AGENT', author_name: 'Agent A', created_at: '' })}
        timeZone="UTC"
      />,
    );
    expect(screen.getByText('Agent A')).toBeOnTheScreen();
    // No valid timestamp → no time line.
    expect(screen.queryByText('10:00')).toBeNull();
  });

  it('centers a SYSTEM timeline line (B7)', () => {
    renderWithProviders(
      <TicketMessageBubble
        message={msg({ author_role: 'SYSTEM', body_text: 'Ticket marked resolved by Me.' })}
        timeZone="UTC"
      />,
    );
    expect(screen.getByText('Ticket marked resolved by Me.')).toBeOnTheScreen();
    expect(screen.getByTestId('ticket-msg-m1')).toBeOnTheScreen();
  });
});
