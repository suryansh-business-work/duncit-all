/**
 * Live pod challenges — the framework-free half shared by mWeb and the native
 * app (rules 27/40). The server is the only authority on scores, standings and
 * permissions; this module only owns the client contract around it: where the
 * live view lives, how a running clock is shown, and how a client follows the
 * challenge's Socket.IO room.
 */

/**
 * A JSON object the server sends as a string (tool settings, per-tool metrics).
 * Anything malformed or not an object reads as empty rather than throwing, so
 * one bad field never blanks a live scoreboard.
 */
export function parseJsonObject(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The full-screen Live Challenge Arena. */
export const podChallengeLivePath = (podId: string, challengeId: string): string =>
  `/pod/${podId}/challenges/${challengeId}/live`;

/** The same path as a full URL, for a link that leaves the app. */
export const podChallengeLiveLink = (podId: string, challengeId: string, baseUrl: string): string =>
  `${baseUrl}${podChallengeLivePath(podId, challengeId)}`;

/** Host Studio's challenge controls for one pod. */
export const hostPodChallengesPath = (podId: string): string => `/host/pod/${podId}/challenges`;

export type PodChallengeStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';

/** Statuses in which the challenge is still being played (live preview, not a result). */
export const isChallengeInPlay = (status: string): boolean => status === 'LIVE' || status === 'PAUSED';

/** Statuses after play (a published result replaces the live view). */
export const isChallengeFinished = (status: string): boolean => status === 'COMPLETED' || status === 'ARCHIVED';

export interface ChallengeClock {
  clock_running: boolean;
  /** Elapsed ms at `serverNow`. */
  clock_elapsed_ms: number;
}

/**
 * The clock's elapsed time now. The server reports the elapsed time at its own
 * `server_now`; while running, the client adds the time that has passed since
 * it RECEIVED that answer — never its own wall clock against the server's, so
 * a phone with the wrong time still shows the right clock.
 */
export function clockElapsedMs(clock: ChallengeClock, receivedAtMs: number, nowMs: number): number {
  return clock.clock_running ? clock.clock_elapsed_ms + Math.max(0, nowMs - receivedAtMs) : clock.clock_elapsed_ms;
}

/** What the clock face shows: elapsed for a stopwatch, remaining for a countdown (never below zero). */
export function clockDisplayMs(elapsedMs: number, mode: string, durationSeconds: number): number {
  return mode === 'COUNTDOWN' ? Math.max(0, durationSeconds * 1000 - elapsedMs) : elapsedMs;
}

/** "mm:ss", or "h:mm:ss" past an hour. Digits only, so it reads the same in every locale. */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** The socket frame the server emits after every persisted change. */
export const CHALLENGE_CHANGED_EVENT = 'challenge:changed';

export interface ChallengeChangedFrame {
  challengeId: string;
  revision: number;
  kind: string;
}

/** The slice of socket.io-client this needs, typed structurally (no dependency). */
export interface ChallengeSocketLike {
  connected?: boolean;
  on(event: string, handler: (payload: unknown) => void): unknown;
  off(event: string, handler: (payload: unknown) => void): unknown;
  emit(event: string, ...args: unknown[]): unknown;
}

function isFrame(payload: unknown): payload is ChallengeChangedFrame {
  const f = payload as Partial<ChallengeChangedFrame> | null;
  return !!f && typeof f.challengeId === 'string' && typeof f.revision === 'number';
}

/**
 * Follows one challenge's room. Every (re)connect re-joins and asks for a
 * refetch — a reconnecting client always catches up on what it missed — and
 * every `challenge:changed` for this challenge with a newer revision triggers
 * one. Returns the cleanup.
 */
export function watchChallenge(
  socket: ChallengeSocketLike,
  challengeId: string,
  currentRevision: () => number,
  onStale: () => void
): () => void {
  const join = () => {
    socket.emit('join_challenge', challengeId);
    onStale();
  };
  const changed = (payload: unknown) => {
    if (isFrame(payload) && payload.challengeId === challengeId && payload.revision > currentRevision()) onStale();
  };
  socket.on('connect', join);
  socket.on(CHALLENGE_CHANGED_EVENT, changed);
  if (socket.connected) join();
  return () => {
    socket.emit('leave_challenge', challengeId);
    socket.off('connect', join);
    socket.off(CHALLENGE_CHANGED_EVENT, changed);
  };
}

/** How often a viewer without a live socket (signed out, or reconnecting) re-reads. */
export const CHALLENGE_POLL_MS = 5000;

