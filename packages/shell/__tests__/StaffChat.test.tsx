import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import CoworkerList from '../src/staff-chat/CoworkerList';
import Conversation from '../src/staff-chat/Conversation';
import type { Coworker, StaffMessage, StaffThread } from '../src/staff-chat/queries';
import { useStaffSocket } from '../src/staff-chat/useStaffSocket';

const beep = vi.hoisted(() => vi.fn());
const socketOn = vi.hoisted(() => ({ handlers: {} as Record<string, (p: unknown) => void> }));

vi.mock('@duncit/utils', async (io) => {
  const actual = await io<typeof import('@duncit/utils')>();
  return { ...actual, playNotificationBeep: beep };
});

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, handler: (p: unknown) => void) => {
      socketOn.handlers[event] = handler;
    },
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

const person = (id: string, name: string): Coworker => ({
  id,
  name,
  email: `${id}@duncit.com`,
  photo: '',
  roles: ['FINANCE_MANAGER'],
});

describe('CoworkerList', () => {
  const props = {
    search: '',
    onSearch: vi.fn(),
    role: '',
    onRole: vi.fn(),
    onOpen: vi.fn(),
  };

  it('puts conversations above the directory and never lists a person twice', () => {
    const asha = person('u1', 'Asha Rao');
    const threads: StaffThread[] = [
      { peer: asha, last_text: 'sent the invoice', last_at: null, last_from_me: true, unread: 2 },
    ];
    render(
      <CoworkerList {...props} threads={threads} coworkers={[asha, person('u2', 'Bo Chen')]} />
    );

    // Asha is the thread row, not also a directory row.
    expect(screen.getAllByText('Asha Rao')).toHaveLength(1);
    // The last line says who wrote it without the browser comparing ids.
    expect(screen.getByText('You: sent the invoice')).toBeInTheDocument();
    expect(screen.getByText('Bo Chen')).toBeInTheDocument();
  });

  it('hides the conversation list while searching, so results are the whole list', () => {
    const asha = person('u1', 'Asha Rao');
    render(
      <CoworkerList
        {...props}
        search="bo"
        threads={[{ peer: asha, last_text: 'hi', last_at: null, last_from_me: false, unread: 0 }]}
        coworkers={[person('u2', 'Bo Chen')]}
      />
    );
    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
    expect(screen.getByText('Bo Chen')).toBeInTheDocument();
  });
});

describe('Conversation', () => {
  const message = (id: string, from: string, text: string): StaffMessage => ({
    id,
    from_user_id: from,
    to_user_id: from === 'me' ? 'u1' : 'me',
    text,
    read_at: null,
    created_at: '2026-08-06T10:00:00.000Z',
  });

  it('sends on Enter and keeps Shift+Enter for a new line', () => {
    const onSend = vi.fn();
    render(
      <Conversation
        peer={person('u1', 'Asha Rao')}
        meId="me"
        messages={[]}
        sending={false}
        onBack={vi.fn()}
        onSend={onSend}
        onTyping={vi.fn()}
      />
    );
    const box = screen.getByPlaceholderText('Write a message');
    fireEvent.change(box, { target: { value: 'ready?' } });

    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('ready?');
  });

  it('does not send whitespace', () => {
    const onSend = vi.fn();
    render(
      <Conversation
        peer={person('u1', 'Asha Rao')}
        meId="me"
        messages={[]}
        sending={false}
        onBack={vi.fn()}
        onSend={onSend}
        onTyping={vi.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Write a message'), { target: { value: '   ' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Write a message'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows both sides of the conversation', () => {
    render(
      <Conversation
        peer={person('u1', 'Asha Rao')}
        meId="me"
        messages={[message('m1', 'u1', 'did you see it'), message('m2', 'me', 'just now')]}
        sending={false}
        onBack={vi.fn()}
        onSend={vi.fn()}
        onTyping={vi.fn()}
      />
    );
    expect(screen.getByText('did you see it')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
  });
});

describe('useStaffSocket beep', () => {
  beforeEach(() => {
    beep.mockClear();
    socketOn.handlers = {};
  });

  /** A tiny host so the hook can be driven without the whole drawer. */
  function Host({ meId, openPeerId }: Readonly<{ meId: string; openPeerId: string | null }>) {
    useStaffSocket({
      graphqlUrl: 'https://server.test/graphql',
      token: 'tok',
      onMessage: vi.fn(),
      meId,
      openPeerId,
    });
    return null;
  }

  const arrive = (from: string) =>
    socketOn.handlers.staff_message?.({ id: 'm', from_user_id: from, to_user_id: 'me', text: 'hi' });

  it('beeps for a message from someone else', async () => {
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId={null} />
      </MockedProvider>
    );
    arrive('u1');
    await waitFor(() => expect(beep).toHaveBeenCalledTimes(1));
  });

  it('stays silent for your own message from another tab', async () => {
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId={null} />
      </MockedProvider>
    );
    arrive('me');
    await waitFor(() => expect(beep).not.toHaveBeenCalled());
  });

  it('stays silent for the conversation already on screen', async () => {
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId="u1" />
      </MockedProvider>
    );
    arrive('u1');
    await waitFor(() => expect(beep).not.toHaveBeenCalled());
  });
});
