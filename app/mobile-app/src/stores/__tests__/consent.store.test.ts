import { serializeConsent, type ConsentChoice } from '@duncit/utils';

// Each case loads the store in its own module registry (the launch read is
// cached at module scope), so the mocks delegate to functions shared across
// registries rather than being per-registry jest.fn()s.
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockRemove = jest.fn();
const mockLogError = jest.fn();
jest.mock('@/services/secure-storage', () => ({
  getItem: (key: string) => mockGet(key),
  setItem: (key: string, value: string) => mockSet(key, value),
  removeItem: (key: string) => mockRemove(key),
}));
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: (...args: unknown[]) => mockLogError(...args) } },
}));

const choice = (analytics: boolean, marketing: boolean): ConsentChoice => ({
  analytics,
  marketing,
  decided_at: new Date().toISOString(),
});

type StoreModule = typeof import('@/stores/consent.store');

/** A fresh module per case — the launch read is cached at module scope. */
function loadStore() {
  const loaded: { module?: StoreModule } = {};
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded.module = require('@/stores/consent.store') as StoreModule;
  });
  if (!loaded.module) throw new Error('consent store did not load');
  return loaded.module.useConsentStore;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockSet.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

describe('consent store', () => {
  it('starts undecided and unhydrated', () => {
    const store = loadStore();
    expect(store.getState().choice).toBeNull();
    expect(store.getState().hydrated).toBe(false);
  });

  it('hydrates a stored choice once, however many callers ask', async () => {
    const stored = choice(true, false);
    mockGet.mockResolvedValue(serializeConsent(stored));
    const store = loadStore();
    const first = store.getState().hydrate();
    const second = store.getState().hydrate();
    expect(second).toBe(first);
    await first;
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('duncit.consent');
    expect(store.getState()).toMatchObject({ choice: stored, hydrated: true });
  });

  it('hydrates as undecided when nothing is stored', async () => {
    mockGet.mockResolvedValue(null);
    const store = loadStore();
    await store.getState().hydrate();
    expect(store.getState()).toMatchObject({ choice: null, hydrated: true });
  });

  it('hydrates as undecided, and logs, when the keystore is unreadable', async () => {
    mockGet.mockRejectedValue(new Error('no keystore'));
    const store = loadStore();
    await store.getState().hydrate();
    expect(store.getState()).toMatchObject({ choice: null, hydrated: true });
    expect(mockLogError).toHaveBeenCalledWith('consent.store', 'hydrate', expect.anything());
  });

  it('persists a choice that keeps marketing, and keeps the click', () => {
    const store = loadStore();
    const next = choice(true, true);
    store.getState().setChoice(next);
    expect(store.getState().choice).toEqual(next);
    expect(mockSet).toHaveBeenCalledWith('duncit.consent', serializeConsent(next));
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('deletes the stored click when marketing is refused', () => {
    const store = loadStore();
    store.getState().setChoice(choice(true, false));
    expect(mockRemove).toHaveBeenCalledWith('duncit.short_link_click');
  });

  it('logs storage failures instead of throwing', async () => {
    mockSet.mockRejectedValue(new Error('disk'));
    mockRemove.mockRejectedValue(new Error('disk'));
    const store = loadStore();
    store.getState().setChoice(choice(false, false));
    await settle();
    expect(mockLogError).toHaveBeenCalledTimes(2);
    expect(store.getState().choice?.marketing).toBe(false);
  });
});
