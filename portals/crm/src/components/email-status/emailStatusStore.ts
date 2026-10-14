import type { CrmEmailStatusEntry, CrmEmailVerification, EmailStatus } from '../../api/emailVerification.gql';

/** What a badge shows. `status: null` means the lookup failed — show nothing rather than guess. */
export interface EmailStatusEntry {
  status: EmailStatus | null;
  checkedAt: string | null;
  suggestion: string;
  checking: boolean;
}

export type FetchStatuses = (emails: string[]) => Promise<CrmEmailStatusEntry[]>;
/** Runs one check now; null when it failed (the caller has already told the person why). */
export type VerifyOne = (email: string) => Promise<CrmEmailVerification | null>;

/** The server answers at most this many addresses per lookup. */
const LOOKUP_LIMIT = 200;

const NOT_CHECKED: EmailStatusEntry = { status: 'NOT_CHECKED', checkedAt: null, suggestion: '', checking: false };
const LOOKUP_FAILED: EmailStatusEntry = { status: null, checkedAt: null, suggestion: '', checking: false };

export const emailKey = (email: string): string => email.trim().toLowerCase();

const fromServer = (row: CrmEmailStatusEntry): EmailStatusEntry => ({
  status: row.status,
  checkedAt: row.checked_at,
  suggestion: row.suggestion,
  checking: false,
});

const chunks = (items: string[]): string[][] => {
  const out: string[][] = [];
  for (let i = 0; i < items.length; i += LOOKUP_LIMIT) out.push(items.slice(i, i + LOOKUP_LIMIT));
  return out;
};

/**
 * The CRM's one cache of email statuses. Every badge on screen asks for its
 * address during the same render; the asks are gathered and sent as one
 * lookup, so a page of twenty contacts costs one request, not twenty.
 */
export function createEmailStatusStore(
  fetchStatuses: FetchStatuses,
  verifyOne: VerifyOne,
  onError: (error: unknown) => void
) {
  const entries = new Map<string, EmailStatusEntry>();
  const listeners = new Set<() => void>();
  let queued = new Set<string>();
  let flushScheduled = false;

  const emit = () => listeners.forEach((listener) => listener());

  const lookup = async (batch: string[]) => {
    try {
      const found = new Map((await fetchStatuses(batch)).map((row) => [row.email, fromServer(row)]));
      batch.forEach((email) => entries.set(email, found.get(email) ?? NOT_CHECKED));
    } catch (error) {
      onError(error);
      batch.forEach((email) => entries.set(email, LOOKUP_FAILED));
    }
  };

  const flush = async () => {
    flushScheduled = false;
    const batch = [...queued];
    queued = new Set();
    await Promise.all(chunks(batch).map(lookup));
    emit();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get(email: string): EmailStatusEntry | undefined {
      return entries.get(emailKey(email));
    },
    /** Ask for an address's status; repeated asks in one tick share a lookup. */
    request(email: string) {
      const key = emailKey(email);
      if (!key || entries.has(key) || queued.has(key)) return;
      queued.add(key);
      if (flushScheduled) return;
      flushScheduled = true;
      queueMicrotask(() => {
        flush().catch(onError);
      });
    },
    /** Check an address now; every badge for it shows the spinner, then the new verdict. */
    async verify(email: string): Promise<CrmEmailVerification | null> {
      const key = emailKey(email);
      const before = entries.get(key) ?? NOT_CHECKED;
      entries.set(key, { ...before, checking: true });
      emit();
      const result = await verifyOne(email);
      entries.set(key, result ? fromServer({ ...result, checked_at: result.created_at }) : before);
      emit();
      return result;
    },
    /** Forget everything, e.g. after a bulk check finishes — badges ask again. */
    reset() {
      entries.clear();
      emit();
    },
  };
}

export type EmailStatusStore = ReturnType<typeof createEmailStatusStore>;
