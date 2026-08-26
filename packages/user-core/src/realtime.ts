/** The socket frame the server emits from `publishSession`. */
export const USER_CHANGED_EVENT = 'user:changed';

export interface UserChangedFrame {
  user_id: string;
  patch: Record<string, unknown>;
}

/** The slice of socket.io-client this needs — typed structurally so the core
 * stays dependency-free and a test can pass a plain emitter. */
export interface SocketLike {
  on(event: string, handler: (payload: unknown) => void): unknown;
  off(event: string, handler: (payload: unknown) => void): unknown;
  /** Present on a real socket.io client; absent on a plain test emitter. */
  disconnect?: () => unknown;
}

/**
 * Fields a `user:changed` frame is allowed to move.
 *
 * These are the SERVER's names, not the session's — `profile_photo`, not
 * `avatar`. Both surfaces merge the patch into the raw `me` they cache and run
 * `normalizeMe` over the result, so a renamed key here would land on something
 * nothing reads and a new profile photo would silently not appear.
 */
const PATCHABLE = new Set<string>([
  'first_name',
  'last_name',
  'full_name',
  'email',
  'phone_number',
  'phone_extension',
  'profile_photo',
  'bio',
  'roles',
  'locale',
  'timezone',
  'country',
  'city',
  'state',
  'zone',
  'assigned_city',
  'assigned_zones',
  'selected_location_id',
  'is_email_verified',
  'is_phone_verified',
  'onboarding_survey_completed',
  'updated_at',
]);

/**
 * Turn a raw frame into a patch this session may apply.
 *
 * Two things are checked and neither is paranoia. The frame must name THIS
 * user — one socket per surface is shared by whatever the app does next, and a
 * misrouted frame writing someone else's name into the header is the failure
 * this prevents. And `user_id` itself is not patchable: a frame that could
 * rewrite the identity would turn a display bug into an authorisation one.
 */
export function parseUserChangedFrame(
  raw: unknown,
  selfUserId: string,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const frame = raw as Partial<UserChangedFrame>;
  if (!selfUserId || String(frame.user_id ?? '') !== selfUserId) return null;
  if (!frame.patch || typeof frame.patch !== 'object') return null;

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frame.patch)) {
    if (PATCHABLE.has(key)) patch[key] = value;
  }
  return Object.keys(patch).length ? patch : null;
}

/**
 * Listen for this account's changes. Returns the unsubscribe.
 *
 * Each surface owns socket creation — mWeb, native and the portals all already
 * build their own — so this takes a live socket rather than a URL and stays
 * free of a socket.io dependency.
 */
export function subscribeUserChanged(
  socket: SocketLike,
  selfUserId: string,
  onPatch: (patch: Record<string, unknown>) => void,
): () => void {
  const handler = (raw: unknown) => {
    const patch = parseUserChangedFrame(raw, selfUserId);
    if (patch) onPatch(patch);
  };
  socket.on(USER_CHANGED_EVENT, handler);
  return () => {
    socket.off(USER_CHANGED_EVENT, handler);
  };
}

/** The frame the server emits when an account's sessions are revoked. */
export const SESSION_REVOKED_EVENT = 'session:revoked';

export interface SessionRevokedFrame {
  user_id: string;
  /** Why, for the log line. `ACCOUNT_DELETION_REQUESTED` is the only one today. */
  reason: string;
}

/**
 * Sign out the moment the server says this account's sessions have ended.
 *
 * The token is ALREADY refused by then — the server stopped accepting it
 * before it emitted this — so nothing here decides anything. What it does is
 * make the ending visible on a surface that is not currently talking to the
 * server: a phone left on a screen, a tab open in the background. Without it
 * they sit looking signed in until something makes them ask, and "you have
 * been signed out everywhere" is only true of the device somebody is holding.
 *
 * The frame must name THIS user, for the same reason `parseUserChangedFrame`
 * checks: one socket per surface is shared by whatever the app does next, and
 * a misrouted frame that signed the wrong person out would be a far worse bug
 * than a display glitch.
 */
export function subscribeSessionRevoked(
  socket: SocketLike,
  selfUserId: string,
  onRevoked: (reason: string) => void,
): () => void {
  const handler = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const frame = raw as Partial<SessionRevokedFrame>;
    if (!selfUserId || String(frame.user_id ?? '') !== selfUserId) return;
    onRevoked(String(frame.reason ?? ''));
  };
  socket.on(SESSION_REVOKED_EVENT, handler);
  return () => {
    socket.off(SESSION_REVOKED_EVENT, handler);
  };
}
