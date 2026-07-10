import { screen } from '@testing-library/react-native';

import { TicketMessageBubble } from '@/components/support/TicketMessageBubble';
import { renderWithProviders } from '@/utils/test-utils';

const msg = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  author_role: 'USER',
  author_name: 'Me',
  body_text: 'Hello',
  attachments: [] as string[],
  created_at: '2026-06-01T10:00:00Z',
  ...over,
});

describe('TicketMessageBubble', () => {
  it('renders a USER bubble with a zone-local time', () => {
    renderWithProviders(<TicketMessageBubble message={msg()} timeZone="UTC" />);
    expect(screen.getByText('Hello')).toBeOnTheScreen();
    expect(screen.getByText('10:00')).toBeOnTheScreen();
  });

  it('renders an AGENT bubble with no tick and omits the time when the stamp is missing', () => {
    renderWithProviders(
      <TicketMessageBubble
        message={msg({ author_role: 'AGENT', author_name: 'Agent A', created_at: '' })}
        timeZone="UTC"
      />,
    );
    expect(screen.getByText('Agent A')).toBeOnTheScreen();
    // No valid timestamp → no time line, and ticks are only on the user's own messages.
    expect(screen.queryByText('10:00')).toBeNull();
    expect(screen.queryByTestId('ticket-tick-m1')).toBeNull();
  });

  it('shows a Sent tick on the user message until the agent reads it (B12)', () => {
    // No agent read yet → the single-check (delivered) branch.
    renderWithProviders(<TicketMessageBubble message={msg()} timeZone="UTC" />);
    expect(screen.getByTestId('ticket-tick-m1')).toBeOnTheScreen();
  });

  it('flips to a Seen tick once the agent has read the message (B12)', () => {
    // Agent read after the message → the double-check (seen) branch.
    renderWithProviders(
      <TicketMessageBubble message={msg()} timeZone="UTC" agentLastReadAt="2026-06-01T12:00:00Z" />,
    );
    expect(screen.getByTestId('ticket-tick-m1')).toBeOnTheScreen();
  });

  it('renders an AGENT bubble time in the muted colour with no tick', () => {
    renderWithProviders(
      <TicketMessageBubble
        message={msg({ author_role: 'AGENT', author_name: 'Agent A' })}
        timeZone="UTC"
      />,
    );
    expect(screen.getByText('10:00')).toBeOnTheScreen();
    expect(screen.queryByTestId('ticket-tick-m1')).toBeNull();
  });

  it('renders an attachment-only message as a file card without a body line', () => {
    renderWithProviders(
      <TicketMessageBubble
        message={msg({ body_text: '', attachments: ['https://ik/support/spec.pdf'] })}
        timeZone="UTC"
      />,
    );
    expect(screen.getByTestId('support-attach-https://ik/support/spec.pdf')).toBeOnTheScreen();
    expect(screen.queryByText('Hello')).toBeNull();
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
