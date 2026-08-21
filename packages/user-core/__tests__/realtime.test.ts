import { describe, expect, it, vi } from 'vitest';

import {
  USER_CHANGED_EVENT,
  parseUserChangedFrame,
  subscribeUserChanged,
  type SocketLike,
} from '../src/realtime';

const SELF = 'u-1';

describe('parseUserChangedFrame', () => {
  it('keeps the patchable fields under the SERVER names normalizeMe reads', () => {
    const patch = parseUserChangedFrame(
      { user_id: SELF, patch: { profile_photo: 'https://cdn/new.png', roles: ['HOST'], updated_at: 'now' } },
      SELF
    );

    expect(patch).toEqual({ profile_photo: 'https://cdn/new.png', roles: ['HOST'], updated_at: 'now' });
  });

  it('drops a frame addressed to somebody else — one socket is shared by whatever the app does next', () => {
    expect(parseUserChangedFrame({ user_id: 'u-2', patch: { city: 'Pune' } }, SELF)).toBeNull();
  });

  it('refuses to answer when this surface has no session yet', () => {
    expect(parseUserChangedFrame({ user_id: SELF, patch: { city: 'Pune' } }, '')).toBeNull();
  });

  it('never lets a frame rewrite the identity itself', () => {
    expect(parseUserChangedFrame({ user_id: SELF, patch: { user_id: 'u-999' } }, SELF)).toBeNull();
  });

  it('silently ignores fields nothing reads instead of writing them into the session', () => {
    const patch = parseUserChangedFrame({ user_id: SELF, patch: { avatar: 'x', city: 'Pune' } }, SELF);

    expect(patch).toEqual({ city: 'Pune' });
  });

  it('returns null rather than an empty patch when nothing survived', () => {
    expect(parseUserChangedFrame({ user_id: SELF, patch: {} }, SELF)).toBeNull();
    expect(parseUserChangedFrame({ user_id: SELF, patch: { nonsense: 1 } }, SELF)).toBeNull();
  });

  it.each([[null], [undefined], ['frame'], [7], [{}], [{ user_id: SELF }], [{ user_id: SELF, patch: 'no' }]])(
    'survives the malformed frame %j',
    (raw) => {
      expect(parseUserChangedFrame(raw, SELF)).toBeNull();
    }
  );

  it('compares the id as a string, so a numeric user_id still matches', () => {
    expect(parseUserChangedFrame({ user_id: 7, patch: { city: 'Pune' } }, '7')).toEqual({ city: 'Pune' });
  });
});

describe('subscribeUserChanged', () => {
  const makeSocket = () => {
    const handlers = new Map<string, (payload: unknown) => void>();
    const socket: SocketLike = {
      on: vi.fn((event, handler) => handlers.set(event, handler)),
      off: vi.fn((event) => handlers.delete(event)),
    };
    return { socket, emit: (payload: unknown) => handlers.get(USER_CHANGED_EVENT)?.(payload) };
  };

  it('listens on the frame the server publishes', () => {
    const { socket } = makeSocket();

    subscribeUserChanged(socket, SELF, vi.fn());

    expect(socket.on).toHaveBeenCalledWith('user:changed', expect.any(Function));
  });

  it('hands through only the patches this account may apply', () => {
    const { socket, emit } = makeSocket();
    const onPatch = vi.fn();

    subscribeUserChanged(socket, SELF, onPatch);
    emit({ user_id: SELF, patch: { city: 'Pune' } });
    emit({ user_id: 'someone-else', patch: { city: 'Goa' } });
    emit(null);

    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch).toHaveBeenCalledWith({ city: 'Pune' });
  });

  it('unsubscribes the same handler it registered', () => {
    const { socket, emit } = makeSocket();
    const onPatch = vi.fn();

    subscribeUserChanged(socket, SELF, onPatch)();
    emit({ user_id: SELF, patch: { city: 'Pune' } });

    expect(socket.off).toHaveBeenCalledWith('user:changed', (socket.on as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]);
    expect(onPatch).not.toHaveBeenCalled();
  });
});
