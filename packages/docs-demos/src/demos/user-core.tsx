import {
  accountEmail,
  accountName,
  can,
  canAny,
  hasAppAccess,
  initials,
  normalizeMe,
  parseUserChangedFrame,
  subscribeSessionRevoked,
  subscribeUserChanged,
  type SocketLike,
} from '@duncit/user-core';
import { defineDemo, defineDemos } from '../types';

/** The `me` payload exactly as the server answers it. */
interface MeMock {
  me: Record<string, unknown>;
  /** What a portal declares in VITE_REQUIRED_ROLES. */
  required_roles: string[];
}

/** Two frames off the per-account socket room, and who this session is. */
interface RealtimeMock {
  self_user_id: string;
  user_changed: Record<string, unknown>;
  session_revoked: Record<string, unknown>;
}

/**
 * A `SocketLike` that hands each subscriber one frame and records what it did.
 *
 * `SocketLike` is typed structurally precisely so this is possible — the
 * package takes no socket.io dependency, so a plain object is a legitimate
 * socket here, in a demo exactly as in a test.
 */
function replaySocket(frames: Record<string, unknown>): {
  socket: SocketLike;
  delivered: string[];
} {
  const delivered: string[] = [];
  const socket: SocketLike = {
    on(event, handler) {
      if (event in frames) handler(frames[event]);
      return undefined;
    },
    off() {
      delivered.push('unsubscribed');
      return undefined;
    },
  };
  return { socket, delivered };
}

export default defineDemos('user-core', [
  defineDemo<MeMock>({
    id: 'session',
    title: 'One session shape, derived once',
    note:
      "Drop user_id and normalizeMe returns null — an object without one is a malformed answer, not an anonymous user. Take CITY_ADMIN out of roles and the portal gate below closes.",
    mock: {
      me: {
        user_id: '66f1c0a4e2b9a41d7c3f8a12',
        first_name: 'Meera',
        last_name: 'Nair',
        full_name: 'Meera Nair',
        email: 'meera@duncit.com',
        phone_number: '9845012345',
        phone_extension: '+91',
        roles: ['USER', 'HOST', 'CITY_ADMIN'],
        locale: 'en-IN',
        timezone: 'Asia/Kolkata',
        country: 'India',
        city: 'Bengaluru',
      },
      required_roles: ['SUPER_ADMIN', 'CITY_ADMIN'],
    },
    compute: (mock) => {
      const user = normalizeMe(mock.me);
      const roles = user?.roles ?? [];
      return {
        'normalizeMe(me)': user ? 'a SessionUser' : 'null — no user_id',
        'accountName(user)': accountName(user),
        'accountEmail(user)': accountEmail(user),
        'initials(user)': initials(user),
        'Roles held': roles,
        "can(roles, 'HOST', 'CITY_ADMIN')": can(roles, 'HOST', 'CITY_ADMIN'),
        "canAny(roles, 'SUPER_ADMIN', 'HOST')": canAny(roles, 'SUPER_ADMIN', 'HOST'),
        'hasAppAccess(roles, required_roles)': hasAppAccess(roles, mock.required_roles),
      };
    },
  }),

  defineDemo<RealtimeMock>({
    id: 'realtime',
    title: 'Two frames, one room, one identity check',
    note:
      "Change self_user_id so it no longer matches either frame and BOTH go quiet — the patch is dropped and the sign-out never fires. That check is the whole safety of a socket that is shared with everything else the app does: one frame is a display bug misrouted, the other signs the wrong person out. Add a key the server does not allow to move (try 'user_id' or 'is_admin') and watch it get filtered out of the patch.",
    mock: {
      self_user_id: '66f1c0a4e2b9a41d7c3f8a12',
      user_changed: {
        user_id: '66f1c0a4e2b9a41d7c3f8a12',
        patch: { first_name: 'Meera', city: 'Bengaluru', is_admin: true },
      },
      session_revoked: {
        user_id: '66f1c0a4e2b9a41d7c3f8a12',
        reason: 'ACCOUNT_DELETION_REQUESTED',
      },
    },
    compute: (mock) => {
      const patch = parseUserChangedFrame(mock.user_changed, mock.self_user_id);

      const applied: Record<string, unknown>[] = [];
      const changed = replaySocket({ 'user:changed': mock.user_changed });
      const offChanged = subscribeUserChanged(changed.socket, mock.self_user_id, (next) =>
        applied.push(next)
      );
      offChanged();

      const revocations: string[] = [];
      const revoked = replaySocket({ 'session:revoked': mock.session_revoked });
      const offRevoked = subscribeSessionRevoked(revoked.socket, mock.self_user_id, (reason) =>
        revocations.push(reason)
      );
      offRevoked();

      return {
        'parseUserChangedFrame(...)': patch ?? 'null — wrong user, or nothing patchable left',
        'Fields the server allows to move': patch ? Object.keys(patch) : [],
        'subscribeUserChanged delivered': applied,
        'subscribeSessionRevoked delivered': revocations,
        'Sessions ended by this frame': revocations.length,
      };
    },
  }),
]);
