import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import PodChatEntry from '../PodChatEntry';
import type { PodChatAccessInput } from '@duncit/utils';

function renderEntry(access: PodChatAccessInput) {
  return render(
    <MemoryRouter initialEntries={['/club/run-club/pod/sunday-run']}>
      <Routes>
        <Route path="/club/:clubSlug/pod/:podSlug" element={<PodChatEntry podId="p1" {...access} />} />
        <Route path="/chats/:id" element={<p data-testid="chat-room-route">room</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PodChatEntry', () => {
  it('opens the pod’s chat room for an attendee', () => {
    renderEntry({ viewerId: 'u2', hostIds: ['u1'], attendeeIds: ['u2'], isMember: false });
    expect(screen.getByTestId('pod-chat-hint')).toHaveTextContent('Talk to the host and everyone going.');
    const open = screen.getByRole('button', { name: 'Pod chat' });
    expect(open).toBeEnabled();
    expect(open).toHaveAccessibleDescription('Talk to the host and everyone going.');
    fireEvent.click(open);
    expect(screen.getByTestId('chat-room-route')).toBeInTheDocument();
  });

  it('opens the room for the pod’s host', () => {
    renderEntry({ viewerId: 'u1', hostIds: ['u1'], attendeeIds: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Pod chat' }));
    expect(screen.getByTestId('chat-room-route')).toBeInTheDocument();
  });

  it('shows the entry locked to a viewer without a booking, with the reason beside it', () => {
    renderEntry({ viewerId: 'u9', hostIds: ['u1'], attendeeIds: ['u2'], isMember: false });
    const open = screen.getByRole('button', { name: 'Pod chat' });
    expect(open).toBeDisabled();
    expect(open).toHaveAccessibleDescription('Book a spot to join the pod chat.');
    expect(screen.queryByTestId('chat-room-route')).not.toBeInTheDocument();
  });

  it('keeps it locked when nobody is signed in', () => {
    renderEntry({ viewerId: null, hostIds: ['u1'], attendeeIds: ['u2'] });
    expect(screen.getByRole('button', { name: 'Pod chat' })).toBeDisabled();
  });
});
