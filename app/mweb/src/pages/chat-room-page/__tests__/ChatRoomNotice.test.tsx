import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChatClosedNotice from '../ChatClosedNotice';
import ChatRoomNotice from '../ChatRoomNotice';

describe('ChatRoomNotice', () => {
  it('shows the live state by default', () => {
    render(<ChatRoomNotice />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Keep the plan in one place')).toBeInTheDocument();
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
