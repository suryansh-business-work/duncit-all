import { describe, expect, it, vi } from 'vitest';
import {
  CONTACT_SYNC_BATCH_SIZE,
  CONTACTS_PAGE_SIZE,
  applyContactPage,
  contactLoadStatus,
  createContactPager,
  initialContactPages,
  progressPercent,
  streamContactPages,
  syncContactsInSlices,
  type ContactPageEvent,
  type ContactPagesState,
  type ContactsPage,
} from '../src/contact-pages';

interface Row {
  phone_key: string;
  contact_label: string;
}

/** A phone book of `total` numbers, served a page at a time the way the server does. */
function phoneBook(total: number) {
  const rows: Row[] = Array.from({ length: total }, (_, index) => ({
    phone_key: `98${String(index).padStart(8, '0')}`,
    contact_label: `Contact ${index}`,
  }));
  return vi.fn(
    async (offset: number, limit: number): Promise<ContactsPage<Row>> => ({
      total,
      rows: rows.slice(offset, offset + limit),
    })
  );
}

/** A page the test answers by hand, so it can cancel while the page is in flight. */
function heldPage() {
  let answer!: (page: ContactsPage<Row>) => void;
  let refuse!: (error: Error) => void;
  const promise = new Promise<ContactsPage<Row>>((resolve, reject) => {
    answer = resolve;
    refuse = reject;
  });
  return { promise, answer, refuse };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A state holder shaped like React's setter, for the pager to write into. */
function stateHolder() {
  let state: ContactPagesState<Row> = initialContactPages<Row>();
  return {
    set: (update: (current: ContactPagesState<Row>) => ContactPagesState<Row>) => {
      state = update(state);
    },
    get: () => state,
  };
}

describe('streamContactPages', () => {
  it('walks every page, stepping by the page size it asked for', async () => {
    const fetchPage = phoneBook(5);
    const events: ContactPageEvent<Row>[] = [];
    await new Promise<void>((resolve) => {
      streamContactPages({
        fetchPage,
        pageSize: 2,
        onPage: (event) => {
          events.push(event);
          if (event.done) resolve();
        },
        onError: () => resolve(),
      });
    });
    expect(fetchPage.mock.calls).toEqual([
      [0, 2],
      [2, 2],
      [4, 2],
    ]);
    expect(events.map(({ offset, done, rows }) => [offset, done, rows.length])).toEqual([
      [0, false, 2],
      [2, false, 2],
      [4, true, 1],
    ]);
  });

  it('asks for CONTACTS_PAGE_SIZE by default, and an empty list is one finished page', async () => {
    const fetchPage = phoneBook(0);
    const onPage = vi.fn();
    const stream = streamContactPages({ fetchPage, onPage, onError: vi.fn() });
    await stream.firstPage;
    expect(fetchPage).toHaveBeenCalledWith(0, CONTACTS_PAGE_SIZE);
    expect(onPage).toHaveBeenCalledWith({ rows: [], offset: 0, total: 0, done: true });
  });

  it('settles firstPage as soon as the first page lands, while the rest are still coming', async () => {
    const second = heldPage();
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ total: 4, rows: [{ phone_key: '9876543210', contact_label: 'Ritu' }] })
      .mockReturnValueOnce(second.promise);
    const onPage = vi.fn();
    const stream = streamContactPages({ fetchPage, onPage, onError: vi.fn(), pageSize: 2 });
    await stream.firstPage;
    expect(onPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    stream.cancel();
  });

  it('never reports a page that lands after the walk was cancelled', async () => {
    const page = heldPage();
    const onPage = vi.fn();
    const stream = streamContactPages({ fetchPage: () => page.promise, onPage, onError: vi.fn() });
    stream.cancel();
    await stream.firstPage;
    page.answer({ total: 1, rows: [{ phone_key: '9876543210', contact_label: 'Ritu' }] });
    await settle();
    expect(onPage).not.toHaveBeenCalled();
  });

  it('stops fetching when it is cancelled from inside onPage', async () => {
    const fetchPage = phoneBook(5);
    const stream = streamContactPages({
      fetchPage,
      pageSize: 2,
      onPage: () => stream.cancel(),
      onError: vi.fn(),
    });
    await stream.firstPage;
    await settle();
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('reports a failed page, and settles firstPage anyway', async () => {
    const failure = new Error('Network request failed');
    const onError = vi.fn();
    const stream = streamContactPages({
      fetchPage: () => Promise.reject(failure),
      onPage: vi.fn(),
      onError,
    });
    await stream.firstPage;
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('keeps quiet about a failure that arrives after the walk was cancelled', async () => {
    const page = heldPage();
    const onError = vi.fn();
    const stream = streamContactPages({ fetchPage: () => page.promise, onPage: vi.fn(), onError });
    stream.cancel();
    page.refuse(new Error('Network request failed'));
    await settle();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('applyContactPage', () => {
  const ritu = { phone_key: '9876543210', contact_label: 'Ritu' };
  const karan = { phone_key: '9876543211', contact_label: 'Karan' };

  it('replaces the list with the first page and appends every later one', () => {
    expect(applyContactPage([karan], { rows: [ritu], offset: 0, total: 2, done: false })).toEqual([ritu]);
    expect(applyContactPage([ritu], { rows: [karan], offset: 200, total: 2, done: true })).toEqual([
      ritu,
      karan,
    ]);
  });
});

describe('createContactPager', () => {
  it('streams every page into state, then reads as finished', async () => {
    const holder = stateHolder();
    const pager = createContactPager(phoneBook(450), holder.set);
    const first = pager.reload();
    expect(holder.get().loading).toBe(true);
    await first;
    expect(holder.get()).toMatchObject({ loading: false, total: 450 });
    await vi.waitFor(() => expect(holder.get().rows).toHaveLength(450));
    expect(holder.get()).toMatchObject({ loading: false, loadingMore: false, error: undefined });
  });

  it('patches rows in place without re-reading the list', async () => {
    const holder = stateHolder();
    const pager = createContactPager(phoneBook(3), holder.set);
    await pager.reload();
    pager.patch((rows) => rows.filter((row) => row.phone_key !== '9800000001'));
    expect(holder.get().rows.map((row) => row.contact_label)).toEqual(['Contact 0', 'Contact 2']);
  });

  it('keeps the rows it has and says why when a reload fails', async () => {
    const holder = stateHolder();
    const failure = new Error('Network request failed');
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ total: 1, rows: [{ phone_key: '9876543210', contact_label: 'Ritu' }] })
      .mockRejectedValueOnce(failure);
    const pager = createContactPager<Row>(fetchPage, holder.set);
    await pager.reload();
    await pager.reload();
    expect(holder.get()).toMatchObject({ loading: false, loadingMore: false, error: failure });
    expect(holder.get().rows).toHaveLength(1);
  });

  it('lets a newer reload win over one still in flight, and a cancel before any reload is harmless', async () => {
    const holder = stateHolder();
    const stale = heldPage();
    const fresh = heldPage();
    const fetchPage = vi.fn().mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    const pager = createContactPager<Row>(fetchPage, holder.set);
    pager.cancel();
    const staleFirst = pager.reload();
    const freshFirst = pager.reload();
    fresh.answer({ total: 1, rows: [{ phone_key: '9876543211', contact_label: 'Karan' }] });
    stale.answer({ total: 1, rows: [{ phone_key: '9876543210', contact_label: 'Ritu' }] });
    await Promise.all([staleFirst, freshFirst]);
    await settle();
    expect(holder.get().rows.map((row) => row.contact_label)).toEqual(['Karan']);
  });
});

describe('createContactPager — leaving mid-walk', () => {
  it('drops the page in flight when the screen that asked for it cancels', async () => {
    const holder = stateHolder();
    const page = heldPage();
    const pager = createContactPager<Row>(() => page.promise, holder.set);
    const first = pager.reload();
    pager.cancel();
    page.answer({ total: 1, rows: [{ phone_key: '9876543210', contact_label: 'Ritu' }] });
    await first;
    await settle();
    expect(holder.get().rows).toEqual([]);
  });
});

describe('contactLoadStatus', () => {
  const rows = [{ phone_key: '9876543210', contact_label: 'Ritu' }];
  const base = { rows, loading: false, loadingMore: false, error: undefined };

  it('says nothing for a list with no rows yet — the empty state speaks for it', () => {
    expect(contactLoadStatus({ ...base, rows: [], loading: true })).toBe('IDLE');
  });

  it('names what a list on screen is doing', () => {
    expect(contactLoadStatus({ ...base, error: new Error('offline') })).toBe('FAILED');
    expect(contactLoadStatus({ ...base, loading: true })).toBe('REFRESHING');
    expect(contactLoadStatus({ ...base, loadingMore: true })).toBe('STREAMING');
    expect(contactLoadStatus(base)).toBe('IDLE');
  });
});

describe('progressPercent', () => {
  it('is 0-100, clamped, and 0 while the total is unknown', () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(600, 2000)).toBe(30);
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(2100, 2000)).toBe(100);
    expect(progressPercent(-5, 2000)).toBe(0);
  });
});

describe('syncContactsInSlices', () => {
  const entries = Array.from({ length: 5 }, (_, index) => ({
    phone_key: `98765432${String(index).padStart(2, '0')}`,
    label: `Contact ${index}`,
  }));
  const SYNC_ID = '66e1a2b3c4d5e6f708192a3b';

  it('sends the phone book in slices chained by the first slice’s sync_id, the last one closing it', async () => {
    const send = vi.fn().mockResolvedValue({ sync_id: SYNC_ID });
    const onProgress = vi.fn();
    await syncContactsInSlices({ entries, send, onProgress, batchSize: 2 });
    expect(send.mock.calls).toEqual([
      [entries.slice(0, 2), { sync_id: null, last: false }],
      [entries.slice(2, 4), { sync_id: SYNC_ID, last: false }],
      [entries.slice(4), { sync_id: SYNC_ID, last: true }],
    ]);
    expect(onProgress.mock.calls.map(([stage]) => stage.done)).toEqual([0, 2, 4, 5]);
    expect(onProgress).toHaveBeenLastCalledWith({ phase: 'SENDING', done: 5, total: 5 });
  });

  it('still sends one closing slice for an empty phone book — that is what clears the lists', async () => {
    const send = vi.fn().mockResolvedValue({ sync_id: SYNC_ID });
    await syncContactsInSlices({ entries: [], send, onProgress: vi.fn() });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith([], { sync_id: null, last: true });
  });

  it('slices by CONTACT_SYNC_BATCH_SIZE by default', async () => {
    const book = Array.from({ length: CONTACT_SYNC_BATCH_SIZE + 1 }, (_, index) => ({
      phone_key: `9${String(index).padStart(9, '0')}`,
      label: '',
    }));
    const send = vi.fn().mockResolvedValue({ sync_id: SYNC_ID });
    await syncContactsInSlices({ entries: book, send, onProgress: vi.fn() });
    expect(send.mock.calls.map(([slice]) => slice.length)).toEqual([CONTACT_SYNC_BATCH_SIZE, 1]);
  });
});
