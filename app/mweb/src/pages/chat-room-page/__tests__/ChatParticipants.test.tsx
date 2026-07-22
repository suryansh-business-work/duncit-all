import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatParticipants from '../ChatParticipants';

const host = { user_id: 'h1', full_name: 'Alice Host', profile_photo: 'https://x/a.png' };
const participant = { user_id: 'p1', full_name: 'bob rider', profile_photo: null };
const noNameParticipant = { user_id: 'p2', full_name: '' };

describe('ChatParticipants', () => {
  it('renders nothing when there are no hosts and no participants', () => {
    const { container } = render(
      <ChatParticipants hosts={[]} participants={[]} count={0} onOpenProfile={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders singular participant label', () => {
    render(
      <ChatParticipants hosts={[host]} participants={[]} count={1} onOpenProfile={vi.fn()} />,
    );
    expect(screen.getByText('1 participant')).toBeInTheDocument();
  });

  it('renders plural participant label and both host and participant chips', () => {
    render(
      <ChatParticipants
        hosts={[host]}
        participants={[participant, noNameParticipant]}
        count={3}
        onOpenProfile={vi.fn()}
      />,
    );
    expect(screen.getByText('3 participants')).toBeInTheDocument();
    expect(screen.getByTestId('chat-person-h1')).toBeInTheDocument();
    expect(screen.getByTestId('chat-person-p1')).toBeInTheDocument();
    expect(screen.getByTestId('chat-person-p2')).toBeInTheDocument();
    // avatar fallback initial for participant without photo
    expect(screen.getByText('B')).toBeInTheDocument();
    // avatar fallback 'U' for empty name
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('calls onOpenProfile with the user id when a chip is clicked', () => {
    const onOpenProfile = vi.fn();
    render(
      <ChatParticipants
        hosts={[host]}
        participants={[participant]}
        count={2}
        onOpenProfile={onOpenProfile}
      />,
    );
    fireEvent.click(screen.getByTestId('chat-person-h1'));
    expect(onOpenProfile).toHaveBeenCalledWith('h1');
    fireEvent.click(screen.getByTestId('chat-person-p1'));
    expect(onOpenProfile).toHaveBeenCalledWith('p1');
  });
});
