import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import ChatPreviewCard from '../ChatPreviewCard';
import { CHAT_PREVIEW } from '../queries';

const line = (id: string, text: string, extra: Record<string, unknown> = {}) => ({
  __typename: 'PodMessage',
  id,
  user_id: `u-${id}`,
  user_name: `Name ${id}`,
  user_photo: null,
  type: 'TEXT',
  text,
  createdAt: `2026-10-0${id.length}T10:00:00.000Z`,
  ...extra,
});

function previewMock(
  variables: Record<string, unknown>,
  chatPreview: Record<string, unknown> | null,
): MockedResponse {
  return {
    request: { query: CHAT_PREVIEW, variables },
    result: chatPreview
      ? { data: { chatPreview: { __typename: 'ChatPreview', closed: false, ...chatPreview } } }
      : { errors: [{ message: 'boom' } as never] },
  };
}

function renderCard(mocks: MockedResponse[], props: Partial<Parameters<typeof ChatPreviewCard>[0]> = {}) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={['/details']}>
        <Routes>
          <Route path="/details" element={<ChatPreviewCard kind="POD" id="p1" {...props} />} />
          <Route path="/chats/:id" element={<p>pod room</p>} />
          <Route path="/chats/club/:id" element={<p>club room</p>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

const POD = { pod_id: 'p1', limit: 50 };

describe('ChatPreviewCard', () => {
  it('shows a member the whole history with its count and opens the pod’s room', async () => {
    renderCard([
      previewMock(POD, {
        messages: [line('a', 'Court no. 8', { user_photo: 'https://img.example/a.jpg' }), line('b', 'Any spot left?', { user_name: null })],
        total_count: 2,
        is_member: true,
      }),
    ]);
    expect(screen.getByTestId('chat-preview-loading')).toBeInTheDocument();
    expect(await screen.findByText('Court no. 8')).toBeInTheDocument();
    expect(screen.getByText('Any spot left?')).toBeInTheDocument();
    expect(screen.getByText('Name a')).toBeInTheDocument();
    // A writer with no name yet still gets an avatar letter.
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByTestId('chat-preview-count')).toHaveTextContent('2 messages');
    expect(screen.getByTestId('chat-preview-status')).toHaveTextContent('Live now');
    expect(screen.queryByTestId('chat-preview-earlier')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }));
    expect(screen.getByText('pod room')).toBeInTheDocument();
  });

  it('lets a visitor read along but keeps Join the room locked until they book', async () => {
    renderCard([
      previewMock(POD, {
        messages: [line('a', '', { type: 'IMAGE' })],
        total_count: 1,
        is_member: false,
      }),
    ]);
    expect(await screen.findByText('Photo')).toBeInTheDocument();
    expect(screen.getByTestId('chat-preview-count')).toHaveTextContent('1 message');
    const join = screen.getByRole('button', { name: 'Join the room' });
    expect(join).toBeDisabled();
    expect(join).toHaveAccessibleDescription('Book a spot to join the pod chat.');
    expect(screen.queryByRole('button', { name: 'Open chat' })).not.toBeInTheDocument();
  });

  it('joins a club visitor through the club follow, then opens the room as a member', async () => {
    const onJoinClub = vi.fn().mockResolvedValue(undefined);
    const CLUB = { club_id: 'c1', limit: 50 };
    renderCard(
      [
        previewMock(CLUB, { messages: [line('a', 'Season starts Sunday')], total_count: 1, is_member: false }),
        previewMock(CLUB, { messages: [line('a', 'Season starts Sunday')], total_count: 1, is_member: true }),
      ],
      { kind: 'CLUB', id: 'c1', onJoinClub },
    );
    expect(await screen.findByRole('heading', { name: 'Club chat' })).toBeInTheDocument();
    expect(screen.getByText('Join this club to chat with its members.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Join the room' }));
    await waitFor(() => expect(onJoinClub).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Open chat' }));
    expect(screen.getByText('club room')).toBeInTheDocument();
  });

  it('pages back through earlier messages, and says so when a page fails', async () => {
    renderCard([
      previewMock(POD, { messages: [line('cc', 'third'), line('ddd', 'fourth')], total_count: 4, is_member: true }),
      previewMock({ ...POD, before: '2026-10-02T10:00:00.000Z' }, {
        messages: [line('b', 'second'), line('cc', 'third')],
        total_count: 4,
        is_member: true,
      }),
      previewMock({ ...POD, before: '2026-10-01T10:00:00.000Z' }, null),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Show earlier messages' }));
    expect(await screen.findByText('second')).toBeInTheDocument();
    expect(screen.getAllByText('third')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Show earlier messages' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The chat could not load.');
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('marks an ended pod’s room as Ended and an empty room as waiting for its first line', async () => {
    renderCard([previewMock(POD, { messages: [], total_count: 0, is_member: true, closed: true })]);
    expect(await screen.findByTestId('chat-preview-empty')).toHaveTextContent('No messages yet. Say hello!');
    expect(screen.getByTestId('chat-preview-status')).toHaveTextContent('Ended');
    expect(screen.queryByTestId('chat-preview-count')).not.toBeInTheDocument();
  });

  it('says the chat could not load, and Try again asks again', async () => {
    renderCard([
      previewMock(POD, null),
      previewMock(POD, { messages: [line('a', 'Back again')], total_count: 1, is_member: true }),
    ]);
    expect(await screen.findByTestId('chat-preview-error')).toHaveTextContent('The chat could not load.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back again')).toBeInTheDocument();
  });
});
