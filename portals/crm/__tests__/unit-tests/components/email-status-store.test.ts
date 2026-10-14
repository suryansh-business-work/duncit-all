import { describe, expect, it, vi } from 'vitest';
import type { CrmEmailVerification } from '@/api/emailVerification.gql';
import { createEmailStatusStore, emailKey } from '@/components/email-status/emailStatusStore';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const checked = (email: string, status: CrmEmailVerification['status']): CrmEmailVerification => ({
  id: 'r1',
  email,
  status,
  is_valid_syntax: true,
  accepts_mail: true,
  is_deliverable: status === 'VERIFIED',
  is_catch_all: false,
  is_disposable: false,
  is_role_account: false,
  suggestion: '',
  source: 'SINGLE',
  checked_by: 'crm@duncit.com',
  created_at: '2026-10-14T10:00:00.000Z',
});

const setup = (fetchImpl = vi.fn(async () => [] as never[]), verifyImpl = vi.fn(async () => null)) => {
  const onError = vi.fn();
  const store = createEmailStatusStore(fetchImpl, verifyImpl, onError);
  const listener = vi.fn();
  store.subscribe(listener);
  return { store, fetchImpl, verifyImpl, onError, listener };
};

describe('emailKey', () => {
  it('compares addresses case- and space-insensitively', () => {
    expect(emailKey('  Asha@Example.COM ')).toBe('asha@example.com');
  });
});

describe('createEmailStatusStore', () => {
  it('gathers every ask in one tick into a single de-duplicated lookup', async () => {
    const fetchImpl = vi.fn(async () => [
      { email: 'asha@example.com', status: 'VERIFIED' as const, checked_at: '2026-10-14T10:00:00Z', suggestion: '' },
    ]);
    const { store, listener } = setup(fetchImpl);

    store.request('Asha@example.com');
    store.request('asha@example.com ');
    store.request('ravi@example.com');
    store.request('');
    await tick();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(['asha@example.com', 'ravi@example.com']);
    expect(store.get('ASHA@example.com')).toEqual({
      status: 'VERIFIED',
      checkedAt: '2026-10-14T10:00:00Z',
      suggestion: '',
      checking: false,
    });
    // An address the server has no record of is "Not checked", not unknown.
    expect(store.get('ravi@example.com')?.status).toBe('NOT_CHECKED');
    expect(listener).toHaveBeenCalled();
  });

  it('does not ask again for an address it already knows', async () => {
    const { store, fetchImpl } = setup();
    store.request('asha@example.com');
    await tick();
    store.request('asha@example.com');
    await tick();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('splits a large screen into lookups of at most 200 addresses', async () => {
    const { store, fetchImpl } = setup();
    for (let i = 0; i < 450; i++) store.request(`u${i}@example.com`);
    await tick();
    expect(fetchImpl.mock.calls.map(([emails]) => (emails as string[]).length)).toEqual([200, 200, 50]);
  });

  it('reports a failed lookup and shows no status rather than a wrong one', async () => {
    const failure = new Error('network down');
    const { store, onError } = setup(vi.fn(async () => Promise.reject(failure)));

    store.request('asha@example.com');
    await tick();

    expect(onError).toHaveBeenCalledWith(failure);
    expect(store.get('asha@example.com')?.status).toBeNull();
  });

  it('shows the spinner while a check runs, then the fresh verdict', async () => {
    let finish: (value: CrmEmailVerification) => void = () => undefined;
    const verifyImpl = vi.fn(() => new Promise<CrmEmailVerification>((resolve) => { finish = resolve; }));
    const { store } = setup(undefined, verifyImpl);

    const pending = store.verify('Asha@example.com');
    expect(store.get('asha@example.com')).toMatchObject({ status: 'NOT_CHECKED', checking: true });

    finish(checked('asha@example.com', 'VERIFIED'));
    await expect(pending).resolves.toMatchObject({ status: 'VERIFIED' });
    expect(store.get('asha@example.com')).toEqual({
      status: 'VERIFIED',
      checkedAt: '2026-10-14T10:00:00.000Z',
      suggestion: '',
      checking: false,
    });
  });

  it('puts the previous status back when a check fails', async () => {
    const fetchImpl = vi.fn(async () => [
      { email: 'asha@example.com', status: 'RISKY' as const, checked_at: '2026-10-01T00:00:00Z', suggestion: '' },
    ]);
    const { store } = setup(fetchImpl, vi.fn(async () => null));
    store.request('asha@example.com');
    await tick();

    await expect(store.verify('asha@example.com')).resolves.toBeNull();
    expect(store.get('asha@example.com')).toMatchObject({ status: 'RISKY', checking: false });
  });

  it('forgets everything on reset so every badge asks again', async () => {
    const { store, fetchImpl, listener } = setup();
    store.request('asha@example.com');
    await tick();
    listener.mockClear();

    store.reset();

    expect(store.get('asha@example.com')).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
    store.request('asha@example.com');
    await tick();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('stops telling a listener once it unsubscribes', async () => {
    const store = createEmailStatusStore(vi.fn(async () => []), vi.fn(async () => null), vi.fn());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.reset();
    expect(listener).not.toHaveBeenCalled();
  });
});
