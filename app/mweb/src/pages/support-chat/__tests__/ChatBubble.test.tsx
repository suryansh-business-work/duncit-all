import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ChatBubble from '../ChatBubble';
import ClosedNotice from '../SupportChatPage/ClosedNotice';
import AttachmentList from '../../../components/AttachmentList';
import type { SupportChatMessage } from '../queries';

const base: SupportChatMessage = {
  id: 'm1',
  session_id: 's1',
  sender_id: 'u1',
  sender_role: 'USER',
  sender_name: 'Riya',
  sender_photo: null,
  text: 'Hello there',
  attachments: [],
  is_ai: false,
  created_at: '2026-06-26T05:00:00.000Z',
};

const bubble = (over: Partial<SupportChatMessage>, agentLastReadAt: string | null = null, onRetry?: () => void) =>
  render(<ChatBubble msg={{ ...base, ...over }} agentLastReadAt={agentLastReadAt} timeText="10:30" onRetry={onRetry} />);

describe('ChatBubble', () => {
  it('renders a system message as a centred note with no ticks or sender', () => {
    bubble({ sender_role: 'SYSTEM', text: 'Chat handed to an agent' });
    expect(screen.getByText('Chat handed to an agent')).toBeInTheDocument();
    expect(screen.queryByTestId('tick-m1')).not.toBeInTheDocument();
  });

  it('shows the agent name and the time on a support reply, with no delivery tick', () => {
    bubble({ sender_role: 'AGENT', sender_name: 'Meera', text: 'On it' });
    expect(screen.getByText('Meera')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.queryByTestId('tick-m1')).not.toBeInTheDocument();
  });

  it('labels an AI reply as the assistant and an unnamed agent as Support', () => {
    const { unmount } = bubble({ sender_role: 'AGENT', is_ai: true, sender_name: '' });
    expect(screen.getByText('Duncit Assistant')).toBeInTheDocument();
    unmount();
    bubble({ sender_role: 'AGENT', sender_name: '' });
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('walks a user message from sending to sent to seen', () => {
    const pending = bubble({ pending: true });
    expect(screen.getByTestId('tick-m1')).toHaveAccessibleName(/sending/i);
    pending.unmount();

    const sent = bubble({});
    expect(screen.getByTestId('tick-m1')).toHaveAccessibleName(/sent/i);
    sent.unmount();

    bubble({}, '2026-06-26T05:30:00.000Z');
    expect(screen.getByTestId('tick-m1')).toHaveAccessibleName(/seen/i);
  });

  it('offers retry on a failed message and calls it', () => {
    const onRetry = vi.fn();
    bubble({ failed: true }, null, onRetry);
    fireEvent.click(screen.getByTestId('retry-m1'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a failed message without a retry control when none is given', () => {
    bubble({ failed: true });
    expect(screen.getByTestId('tick-m1')).toBeInTheDocument();
    expect(screen.queryByTestId('retry-m1')).not.toBeInTheDocument();
  });
});

describe('AttachmentList', () => {
  it('renders nothing for no attachments', () => {
    const { container } = render(<AttachmentList urls={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an image as a link, a video as a player and a document as a file card', () => {
    const image = 'https://cdn.example.test/p/photo.jpg?tr=w-100';
    const video = 'https://cdn.example.test/p/clip.mp4';
    const doc = 'https://cdn.example.test/p/Invoice%20May.pdf';
    render(<AttachmentList urls={[image, video, doc]} />);
    expect(screen.getByTestId(`attachment-image-${image}`)).toHaveAttribute('href', image);
    expect(screen.getByAltText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByTestId(`attachment-video-${video}`)).toHaveTextContent('clip.mp4');
    const card = screen.getByTestId(`attachment-doc-${doc}`);
    expect(card).toHaveAttribute('href', doc);
    expect(card).toHaveTextContent('Invoice May.pdf');
    expect(card).toHaveTextContent('PDF');
  });
});

describe('ClosedNotice', () => {
  it('names the re-open deadline while the window is open', () => {
    render(<ClosedNotice reopenable reopenDeadline="2099-01-01T00:00:00.000Z" formatDateTime={() => '1 Jan 2099'} />);
    expect(screen.getByTestId('chat-reopen-deadline')).toHaveTextContent('You can reopen it until 1 Jan 2099.');
  });

  it('tells the person to start a new chat once the window has passed', () => {
    render(<ClosedNotice reopenable={false} reopenDeadline={null} formatDateTime={() => ''} />);
    expect(screen.getByTestId('chat-reopen-deadline')).toHaveTextContent(/start a new chat/i);
  });
});
