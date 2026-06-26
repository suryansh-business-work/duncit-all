import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { SupportChatBubble } from '@/components/support-chat/SupportChatBubble';
import type { SupportChatMessage } from '@/hooks/useSupportChat';
import { renderWithProviders } from '@/utils/test-utils';

const base: SupportChatMessage = {
  id: 'm1',
  session_id: 's1',
  sender_id: 'u1',
  sender_role: 'USER' as never,
  sender_name: '',
  sender_photo: null,
  text: 'hello',
  attachments: [],
  is_ai: false,
  created_at: '2026-06-01T10:00:00Z',
};

const make = (over: Partial<SupportChatMessage>): SupportChatMessage => ({ ...base, ...over });

describe('SupportChatBubble', () => {
  it('centers a SYSTEM bubble', () => {
    renderWithProviders(
      <SupportChatBubble
        message={make({ sender_role: 'SYSTEM' as never, text: 'Picked up by A' })}
      />,
    );
    expect(screen.getByText('Picked up by A')).toBeOnTheScreen();
  });

  it('renders pending / delivered / seen tick branches for the user', () => {
    // Rendering each variant exercises the tick-state branches (clock/single/double).
    const a = renderWithProviders(<SupportChatBubble message={make({ pending: true })} />);
    expect(screen.getByTestId('support-msg-m1')).toBeOnTheScreen();
    a.unmount();

    // Delivered: a single grey check.
    const b = renderWithProviders(<SupportChatBubble message={make({})} agentLastReadAt={null} />);
    expect(screen.getByTestId('support-msg-m1')).toBeOnTheScreen();
    b.unmount();

    // Seen: a double blue check.
    renderWithProviders(
      <SupportChatBubble message={make({})} agentLastReadAt="2999-01-01T00:00:00Z" />,
    );
    expect(screen.getByTestId('support-msg-m1')).toBeOnTheScreen();
  });

  it('shows a Retry affordance for a failed message and calls onRetry (B12)', () => {
    const onRetry = jest.fn();
    const failed = make({ failed: true });
    renderWithProviders(<SupportChatBubble message={failed} onRetry={onRetry} />);
    expect(screen.getByText('Failed · Retry')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('retry-m1'));
    expect(onRetry).toHaveBeenCalledWith(failed);
  });

  it('renders a failed message without crashing when no onRetry is supplied', () => {
    renderWithProviders(<SupportChatBubble message={make({ failed: true })} />);
    fireEvent.press(screen.getByTestId('retry-m1'));
    expect(screen.getByTestId('support-msg-m1')).toBeOnTheScreen();
  });

  it('formats the time in the supplied zone', () => {
    renderWithProviders(
      <SupportChatBubble
        message={make({ sender_role: 'AGENT' as never, sender_name: 'A' })}
        timeZone="UTC"
      />,
    );
    // 10:00 UTC renders as 10:00 (device tz is irrelevant when a zone is given).
    expect(screen.getByText('10:00')).toBeOnTheScreen();
  });

  it('labels a human agent (name then Support fallback) and an AI bubble', () => {
    const a = renderWithProviders(
      <SupportChatBubble
        message={make({ sender_role: 'AGENT' as never, sender_name: 'Agent A' })}
      />,
    );
    expect(screen.getByText('Agent A')).toBeOnTheScreen();
    a.unmount();

    const b = renderWithProviders(
      <SupportChatBubble message={make({ sender_role: 'AGENT' as never, sender_name: '' })} />,
    );
    expect(screen.getByText('Support')).toBeOnTheScreen();
    b.unmount();

    renderWithProviders(
      <SupportChatBubble message={make({ sender_role: 'AGENT' as never, is_ai: true })} />,
    );
    expect(screen.getByText('Duncit Assistant')).toBeOnTheScreen();
  });

  it('renders an image attachment and opens a non-image file', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    renderWithProviders(
      <SupportChatBubble
        message={make({ text: '', attachments: ['https://x/a.jpg', 'https://x/doc.pdf'] })}
      />,
    );
    fireEvent.press(screen.getByTestId('support-attach-https://x/doc.pdf'));
    expect(spy).toHaveBeenCalledWith('https://x/doc.pdf');
    spy.mockRestore();
  });
});
