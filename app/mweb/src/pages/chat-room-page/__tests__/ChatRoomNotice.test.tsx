import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChatClosedNotice from '../ChatClosedNotice';
import ChatRoomNotice from '../ChatRoomNotice';

describe('ChatRoomNotice', () => {
  it('shows the live state by default', () => {
    render(<ChatRoomNotice />);
    expect(screen.getByTestId('chat-room-notice-live')).toHaveTextContent('Live');
    // A live pod shows only the chip — no ended line beside it.
    expect(screen.queryByTestId('chat-room-notice-ended')).not.toBeInTheDocument();
    expect(screen.queryByText('This pod has ended')).not.toBeInTheDocument();
  });

  it('shows the ended state when the pod has ended', () => {
    render(<ChatRoomNotice ended />);
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(screen.getByText('This pod has ended')).toBeInTheDocument();
  });
});

describe('ChatClosedNotice', () => {
  it('explains that chat is closed', () => {
    render(<ChatClosedNotice />);
    expect(screen.getByText('This pod has ended — chat is closed.')).toBeInTheDocument();
  });
});
