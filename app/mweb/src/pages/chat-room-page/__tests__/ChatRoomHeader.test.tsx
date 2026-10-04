import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatRoomHeader from '../ChatRoomHeader';

describe('ChatRoomHeader', () => {
  it('renders the provided title and pluralised message count', () => {
    render(<ChatRoomHeader title="Weekend Ride" messageCount={5} onBack={vi.fn()} onOpenPod={vi.fn()} />);
    expect(screen.getByText('Weekend Ride')).toBeInTheDocument();
    expect(screen.getByText('5 messages')).toBeInTheDocument();
    // The page's h1 wraps the tappable group name (a heading inside a button
    // would be flattened away by assistive tech).
    expect(screen.getByRole('heading', { level: 1 })).toContainElement(
      screen.getByRole('button', { name: 'Open pod details for Weekend Ride' }),
    );
  });

  it('uses the singular "message" for a count of 1', () => {
    render(<ChatRoomHeader title="Solo" messageCount={1} onBack={vi.fn()} onOpenPod={vi.fn()} />);
    expect(screen.getByText('1 message')).toBeInTheDocument();
  });

  it('falls back to "Chat" when no title is provided', () => {
    render(<ChatRoomHeader messageCount={0} onBack={vi.fn()} onOpenPod={vi.fn()} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('0 messages')).toBeInTheDocument();
    expect(screen.getByLabelText('Open pod details for Chat')).toBeInTheDocument();
  });

  it('fires onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<ChatRoomHeader title="Room" messageCount={2} onBack={onBack} onOpenPod={vi.fn()} />);
    // The back IconButton is the first button in the header.
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onBack).toHaveBeenCalled();
  });

  it('fires onOpenPod when the group name button is clicked', () => {
    const onOpenPod = vi.fn();
    render(<ChatRoomHeader title="Room" messageCount={2} onBack={vi.fn()} onOpenPod={onOpenPod} />);
    fireEvent.click(screen.getByTestId('chat-room-open-pod'));
    expect(onOpenPod).toHaveBeenCalledTimes(1);
  });
});
