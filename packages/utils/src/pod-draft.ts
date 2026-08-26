/**
 * Draft-pod expiry — one copy of the rule the Host Studio draft list renders.
 *
 * A Create-Pod draft is permanently deleted `draft_retention_days` (Admin >
 * Pods > Pod Settings, default 3) after it was CREATED — not after its last
 * save, so an abandoned draft can never be kept alive forever by an autosave.
 * The server owns the date: `PodDraft.expires_at` is stamped from the same
 * setting the sweep in server/src/modules/pods/pod-draft/pod-draft.cleanup.ts
 * deletes on, so the screen can never promise a day the sweep disagrees with.
 *
 * mWeb and the native app share these derivations and keep their own MUI /
 * Tamagui views (rule 40).
 */

/** A draft inside this window of its deletion is surfaced first, under the
 * Host Studio's info badge. */
export const DRAFT_EXPIRY_WARNING_MS = 24 * 60 * 60 * 1000;

/** The only field these helpers read — every drafts list row carries it. */
export interface ExpiringDraft {
  expires_at?: string | null;
}

/** Milliseconds until the draft is deleted. `null` when the server sent no
 * expiry; negative once it is past due (the sweep runs daily, so a draft can
 * outlive its date by a few hours). */
export function draftMsLeft(draft: ExpiringDraft, now: number = Date.now()): number | null {
  if (!draft.expires_at) return null;
  const at = new Date(draft.expires_at).getTime();
  if (Number.isNaN(at)) return null;
  return at - now;
}

/** True while the draft is within the warning window of deletion — the rule
 * that both moves it to the top of the list and highlights it. */
export function isDraftExpiringSoon(draft: ExpiringDraft, now: number = Date.now()): boolean {
  const left = draftMsLeft(draft, now);
  return left !== null && left <= DRAFT_EXPIRY_WARNING_MS;
}

/** Whole hours left before deletion, floored at 0 — what the countdown chip
 * counts down. 0 means "inside the last hour", not "already gone". */
export function draftHoursLeft(draft: ExpiringDraft, now: number = Date.now()): number {
  const left = draftMsLeft(draft, now);
  if (left === null || left <= 0) return 0;
  return Math.floor(left / (60 * 60 * 1000));
}

/**
 * Splits a drafts list into the about-to-expire group and the rest.
 * `expiring` is ordered soonest-deleted first (the one the host must act on
 * now leads); `rest` keeps the server's order, newest save first.
 */
export function splitDraftsByExpiry<T extends ExpiringDraft>(
  drafts: readonly T[],
  now: number = Date.now()
): { expiring: T[]; rest: T[] } {
  const expiring: T[] = [];
  const rest: T[] = [];
  for (const draft of drafts) {
    if (isDraftExpiringSoon(draft, now)) expiring.push(draft);
    else rest.push(draft);
  }
  expiring.sort((a, b) => (draftMsLeft(a, now) ?? 0) - (draftMsLeft(b, now) ?? 0));
  return { expiring, rest };
}
