/**
 * Create Pod draft autosave, shared by mWeb and the native app so both save
 * the same way (rule 27). Framework-free: each app wraps it in its own hook
 * and draws its own MUI / Tamagui indicator.
 *
 * - The draft id is minted on the device the moment Create Pod opens, so the
 *   URL / route names the draft before anything is saved
 *   ({@link newPodDraftId}). The server creates the draft on its first save.
 * - Saves only when the form really differs from what was last saved, and
 *   only once the host pauses ({@link DRAFT_AUTOSAVE_DEBOUNCE_MS}), so steady
 *   typing costs one request, not one per key.
 * - One request at a time; a change made while one is out is saved after it.
 * - A failed save is retried on its own, backing off to
 *   {@link DRAFT_AUTOSAVE_RETRY_MAX_MS}.
 */

/** What the corner indicator shows. `idle` = nothing saved yet this visit. */
export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** The pause after the last edit before it is saved. */
export const DRAFT_AUTOSAVE_DEBOUNCE_MS = 1200;
/** The first retry after a failed save; each further failure doubles it. */
export const DRAFT_AUTOSAVE_RETRY_MS = 5000;
/** The longest wait between retries. */
export const DRAFT_AUTOSAVE_RETRY_MAX_MS = 30_000;

const HEX_DIGITS = '0123456789abcdef';

/** True for a 24-character lowercase hex id — the shape of a server draft id. */
export function isPodDraftId(id: unknown): id is string {
  return typeof id === 'string' && id.length === 24 && [...id].every((ch) => HEX_DIGITS.includes(ch));
}

/**
 * A new draft id, shaped like a Mongo ObjectId: 8 hex digits of seconds then
 * 16 random hex digits taken from `randomUUID` (`crypto.randomUUID` on the
 * web, `expo-crypto` natively). A v4 UUID's version and variant digits are
 * fixed, so they are skipped.
 */
export function newPodDraftId(randomUUID: () => string, now: number = Date.now()): string {
  const seconds = Math.floor(now / 1000).toString(16).padStart(8, '0').slice(-8);
  const hex = randomUUID().split('-').join('').toLowerCase();
  const random = (hex.slice(0, 12) + hex.slice(13, 16) + hex.slice(17)).slice(0, 16);
  return seconds + random;
}

/** What a surface needs from the stepper's autosave: the indicator's status,
 * and a way to save everything before the host leaves. */
export interface DraftAutosaveHandle {
  status: DraftSaveStatus;
  /** Saves now; resolves true once nothing is left unsaved. */
  flush: () => Promise<boolean>;
  /** True while anything is unsaved, a save in flight included — only then
   * does leaving need to wait for a save. */
  unsaved: boolean;
}

export interface DraftAutosaverOptions<T> {
  /** The draft as the form holds it now. Compared as JSON. */
  read: () => T;
  /** Writes it to the server; rejects when the save failed. */
  save: (value: T) => Promise<unknown>;
  onStatus?: (status: DraftSaveStatus) => void;
  /** Each time the form starts or stops differing from the last save. */
  onUnsaved?: (unsaved: boolean) => void;
  /** Every failed save, for the surface's log. */
  onError?: (error: unknown) => void;
  delayMs?: number;
  retryMs?: number;
  retryMaxMs?: number;
}

export interface DraftAutosaver {
  /** Takes the form as it stands as already saved (what was just loaded). */
  markSaved: () => void;
  /** Something changed: save it once the host pauses. Nothing differs → nothing is sent. */
  schedule: () => void;
  /** Saves now. Resolves true once nothing is left unsaved. */
  flush: () => Promise<boolean>;
  /** True while the form differs from the last save, including one still in flight. */
  hasUnsaved: () => boolean;
  status: () => DraftSaveStatus;
  /** Ends autosaving for good — the pod was published. */
  stop: () => void;
}

export function createDraftAutosaver<T>({
  read,
  save,
  onStatus,
  onUnsaved,
  onError,
  delayMs = DRAFT_AUTOSAVE_DEBOUNCE_MS,
  retryMs = DRAFT_AUTOSAVE_RETRY_MS,
  retryMaxMs = DRAFT_AUTOSAVE_RETRY_MAX_MS,
}: DraftAutosaverOptions<T>): DraftAutosaver {
  const keyOf = (value: T) => JSON.stringify(value);
  let savedKey = keyOf(read());
  let status: DraftSaveStatus = 'idle';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<boolean> | null = null;
  let failures = 0;
  let stopped = false;
  let reportedUnsaved = false;

  // Every save moves through `saving`, so each call is a real change of state.
  const setStatus = (next: DraftSaveStatus) => {
    status = next;
    onStatus?.(next);
  };
  const clearTimer = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };
  const hasUnsaved = () => !stopped && keyOf(read()) !== savedKey;
  const syncUnsaved = () => {
    const next = hasUnsaved();
    if (next === reportedUnsaved) return;
    reportedUnsaved = next;
    onUnsaved?.(next);
  };

  const attempt = async (): Promise<boolean> => {
    const value = read();
    const key = keyOf(value);
    if (key === savedKey) return true;
    setStatus('saving');
    try {
      await save(value);
      savedKey = key;
      failures = 0;
      syncUnsaved();
      setStatus('saved');
      return true;
    } catch (error) {
      failures += 1;
      setStatus('error');
      onError?.(error);
      if (!stopped) later(Math.min(retryMs * 2 ** (failures - 1), retryMaxMs));
      return false;
    }
  };

  const run = async (): Promise<boolean> => {
    clearTimer();
    // One request at a time: wait out the one in flight, then save what is left.
    while (inFlight) await inFlight;
    if (stopped) return true;
    inFlight = attempt();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };

  function later(ms: number) {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      run().catch(onError);
    }, ms);
  }

  return {
    markSaved: () => {
      savedKey = keyOf(read());
      syncUnsaved();
    },
    schedule: () => {
      if (stopped) return;
      syncUnsaved();
      if (reportedUnsaved) {
        later(delayMs);
        return;
      }
      // Back to what the server already holds: nothing to send, nothing failing.
      clearTimer();
      if (status === 'error') setStatus('saved');
    },
    flush: async () => {
      if (!(await run())) return false;
      // An edit made while that save was out is still unsaved: one more pass.
      if (hasUnsaved() && !(await run())) return false;
      return !hasUnsaved();
    },
    hasUnsaved,
    status: () => status,
    stop: () => {
      stopped = true;
      clearTimer();
      syncUnsaved();
    },
  };
}
