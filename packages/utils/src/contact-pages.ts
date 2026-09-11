import type { ContactEntry } from './contact-radar';

/**
 * Your Contacts on Duncit at phone-book scale — the loading both the MUI page
 * and the Tamagui screen share. A phone book of thousands never moves in one
 * request: the lists stream in page by page behind the rows already on
 * screen, and a sync goes up in slices, so both surfaces can say how far along
 * they are instead of freezing on a spinner.
 */

/** Rows one list request asks for. The first page paints the screen; the rest
 * stream in behind it. */
export const CONTACTS_PAGE_SIZE = 200;

/** Phone-book numbers one sync request carries. */
export const CONTACT_SYNC_BATCH_SIZE = 250;

/** One page as the paged contacts queries return it. */
export interface ContactsPage<T> {
  total: number;
  rows: readonly T[];
}

/** One page landing: its rows, where they start, and whether more are coming. */
export interface ContactPageEvent<T> {
  rows: readonly T[];
  /** 0 for the first page, which replaces the list; anything later appends. */
  offset: number;
  total: number;
  done: boolean;
}

export interface ContactPageStreamInput<T> {
  fetchPage: (offset: number, limit: number) => Promise<ContactsPage<T>>;
  onPage: (event: ContactPageEvent<T>) => void;
  onError: (error: unknown) => void;
  pageSize?: number;
}

export interface ContactPageStream {
  /** Settles once the first page has landed or failed — what a pull-to-refresh
   * spinner waits for, while the rest keep streaming behind it. */
  firstPage: Promise<void>;
  /** Stop the walk: nothing more is fetched, and nothing in flight is reported. */
  cancel: () => void;
}

/**
 * Walk a paged list from the top, one page after another, handing each to
 * `onPage` as it lands.
 *
 * Steps by the page size ASKED for, never by the rows returned: the server may
 * leave a row out of its page (a suspended account), and a walk that stepped
 * by what it got would fetch that stretch twice.
 */
export function streamContactPages<T>(input: Readonly<ContactPageStreamInput<T>>): ContactPageStream {
  const { fetchPage, onPage, onError, pageSize = CONTACTS_PAGE_SIZE } = input;
  let cancelled = false;
  // Read through a call: `cancel` flips the flag between two awaits, which a
  // narrowed `!cancelled` would claim cannot happen.
  const live = () => !cancelled;
  // Assigned synchronously by the executor, and only ever called from the
  // closures below — no placeholder function that nothing could run.
  let settleFirst: () => void;
  const firstPage = new Promise<void>((resolve) => {
    settleFirst = resolve;
  });

  const walk = async () => {
    let offset = 0;
    while (live()) {
      const page = await fetchPage(offset, pageSize);
      if (!live()) return;
      const done = offset + pageSize >= page.total;
      onPage({ rows: page.rows, offset, total: page.total, done });
      settleFirst();
      if (done) return;
      offset += pageSize;
    }
  };

  walk()
    .catch((error: unknown) => {
      if (live()) onError(error);
    })
    .finally(() => settleFirst());

  return {
    firstPage,
    cancel: () => {
      cancelled = true;
      settleFirst();
    },
  };
}

/** The rows on screen once a page has landed: the first replaces, the rest append. */
export function applyContactPage<T>(current: readonly T[], event: Readonly<ContactPageEvent<T>>): T[] {
  return event.offset === 0 ? [...event.rows] : [...current, ...event.rows];
}

/** A paged contacts list as a screen holds it. */
export interface ContactPagesState<T> {
  rows: T[];
  total: number;
  /** Until the first page lands. The list keeps whatever it already shows. */
  loading: boolean;
  /** While later pages stream in behind the rows already on screen. */
  loadingMore: boolean;
  error: unknown;
}

/** Before anything has been asked for. */
export const initialContactPages = <T>(): ContactPagesState<T> => ({
  rows: [],
  total: 0,
  loading: true,
  loadingMore: false,
  error: undefined,
});

/** A state setter that takes an updater — React's, or anything shaped like it. */
export type ContactPagesSetter<T> = (
  update: (current: ContactPagesState<T>) => ContactPagesState<T>
) => void;

export interface ContactPager<T> {
  /** Walk from the top again, cancelling any walk in flight. Settles with the first page. */
  reload: () => Promise<void>;
  cancel: () => void;
  /** Edit rows in place — a follow, an invite — without re-reading the list. */
  patch: (update: (rows: T[]) => T[]) => void;
}

/**
 * The whole state machine behind a paged contacts list, minus the framework:
 * each surface hands it a `fetchPage` and its state setter and gets back
 * reload / cancel / patch. A reload cancels the walk in flight, so a stale
 * page never lands on a newer list.
 */
export function createContactPager<T>(
  fetchPage: (offset: number, limit: number) => Promise<ContactsPage<T>>,
  setPages: ContactPagesSetter<T>
): ContactPager<T> {
  let stream: ContactPageStream | null = null;
  const reload = () => {
    stream?.cancel();
    setPages((current) => ({ ...current, loading: true, error: undefined }));
    stream = streamContactPages({
      fetchPage,
      onPage: (event) =>
        setPages((current) => ({
          rows: applyContactPage(current.rows, event),
          total: event.total,
          loading: false,
          loadingMore: !event.done,
          error: undefined,
        })),
      onError: (error) =>
        setPages((current) => ({ ...current, loading: false, loadingMore: false, error })),
    });
    return stream.firstPage;
  };
  return {
    reload,
    cancel: () => stream?.cancel(),
    patch: (update) => setPages((current) => ({ ...current, rows: update(current.rows) })),
  };
}

/**
 * What a list that is already on screen says about its loading: nothing,
 * that the rest could not be fetched, that it is re-reading its first page,
 * or how far the rest has streamed in. A list with nothing on screen yet
 * speaks through its empty state instead, so that is IDLE here.
 */
export type ContactLoadStatus = 'IDLE' | 'FAILED' | 'REFRESHING' | 'STREAMING';

export function contactLoadStatus(
  pages: Readonly<Pick<ContactPagesState<unknown>, 'rows' | 'loading' | 'loadingMore' | 'error'>>
): ContactLoadStatus {
  if (pages.rows.length === 0) return 'IDLE';
  if (pages.error) return 'FAILED';
  if (pages.loading) return 'REFRESHING';
  return pages.loadingMore ? 'STREAMING' : 'IDLE';
}

/** How far a job has got, 0–100 — the value a progress bar draws. */
export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/**
 * Where a sync is, for the bar that shows it: reading the phone book off the
 * device, or sending it up slice by slice. `done` of `total` is contacts read
 * while READING and numbers sent while SENDING.
 */
export interface ContactSyncStage {
  phase: 'READING' | 'SENDING';
  done: number;
  total: number;
}

/** Which slice one request carries — the `batch` argument of `syncContacts`. */
export interface ContactSyncSlice {
  sync_id: string | null;
  last: boolean;
}

export interface ContactSyncInput {
  entries: readonly ContactEntry[];
  send: (entries: ContactEntry[], batch: ContactSyncSlice) => Promise<{ sync_id: string }>;
  onProgress: (stage: ContactSyncStage) => void;
  batchSize?: number;
}

/**
 * Send a phone book up in slices, one after another, chained by the `sync_id`
 * the first slice is given, reporting progress before the first and after
 * each. The last slice is the one that closes the sync on the server. An empty
 * phone book is still one (empty, last) slice — that is what clears the lists
 * once every contact has gone.
 */
export async function syncContactsInSlices(input: Readonly<ContactSyncInput>): Promise<void> {
  const { entries, send, onProgress, batchSize = CONTACT_SYNC_BATCH_SIZE } = input;
  const total = entries.length;
  let syncId: string | null = null;
  let sent = 0;
  onProgress({ phase: 'SENDING', done: 0, total });
  do {
    const slice = entries.slice(sent, sent + batchSize);
    sent += slice.length;
    const result = await send(slice, { sync_id: syncId, last: sent >= total });
    syncId = result.sync_id;
    onProgress({ phase: 'SENDING', done: sent, total });
  } while (sent < total);
}
