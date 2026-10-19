import '@testing-library/jest-dom/vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { notify, playMessagePing } = vi.hoisted(() => ({ notify: vi.fn(), playMessagePing: vi.fn() }));
vi.mock('../../notify', () => ({ notify }));
vi.mock('@duncit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/ui')>()),
  playMessagePing,
}));

import ChatNewAlerts from '../ChatNewAlerts';
import { forwardChatNew, onChatNew } from '../chatAlerts';

type Handler = (payload: unknown) => void;

/** A stand-in session socket: records the chat:new handler so a test can fire frames. */
function fakeSocket() {
  const handlers = new Map<string, Handler>();
  return {
    on: (event: string, handler: Handler) => handlers.set(event, handler),
    emit: (event: string, payload: unknown) => handlers.get(event)?.(payload),
  };
}

const frame = (over: Record<string, unknown> = {}) => ({
  room_kind: 'POD',
  room_id: 'p1',
  message_id: `m-${Math.random()}`,
  title: 'Sunday run',
  sender_name: 'Asha',
  preview: 'on my way',
  type: 'TEXT',
  mentioned: false,
  ...over,
});

beforeEach(() => {
  notify.mockReset();
});

// Each mounted alerts component listens tab-wide; unmount it before the next test.
afterEach(cleanup);

describe('forwardChatNew', () => {
  it('hands well-formed frames to the page and drops junk', () => {
    const socket = fakeSocket();
    forwardChatNew(socket);
    const seen = vi.fn();
    const off = onChatNew(seen);
    socket.emit('chat:new', frame({ message_id: 'ok' }));
    socket.emit('chat:new', { room_kind: 'DM' });
    off();
    socket.emit('chat:new', frame({ message_id: 'after-off' }));
    expect(seen.mock.calls.map(([f]) => f.message_id)).toEqual(['ok']);
  });
});

describe('ChatNewAlerts', () => {
  const mount = (path: string) => {
    const socket = fakeSocket();
    forwardChatNew(socket);
    render(
      <MemoryRouter initialEntries={[path]}>
        <ChatNewAlerts />
      </MemoryRouter>
    );
    return socket;
  };

  it('toasts a message from another room, with the room, the line and an Open action', () => {
    const socket = mount('/home');
    act(() => socket.emit('chat:new', frame()));
    expect(notify).toHaveBeenCalledTimes(1);
    const [message, severity, , action] = notify.mock.calls[0];
    expect(message).toBe('New message in Sunday run · Asha: on my way');
    expect(severity).toBe('info');
    expect(action.label).toBe('Open');
  });

  it('stays quiet for the room already on screen', () => {
    const socket = mount('/chats/p1');
    act(() => socket.emit('chat:new', frame()));
    expect(notify).not.toHaveBeenCalled();
  });

  it('still alerts for a club room while a pod room with the same id is open', () => {
    const socket = mount('/chats/p1');
    act(() => socket.emit('chat:new', frame({ room_kind: 'CLUB' })));
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
