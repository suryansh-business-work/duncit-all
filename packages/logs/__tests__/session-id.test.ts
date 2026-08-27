import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * sessionId() caches in module state (one id per tab / app launch), so every
 * scenario needs a fresh module instance.
 */
const freshSessionId = async () => {
  vi.resetModules();
  const mod = await import('../src/client-info');
  return mod.sessionId;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sessionId', () => {
  it('mints a UUID once and returns the same id for the life of the process (native path)', async () => {
    // No sessionStorage stub: node has none, exactly like React Native.
    const sessionId = await freshSessionId();
    const id = sessionId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(sessionId()).toBe(id);
  });

  it('reuses the id already stored in sessionStorage so a reload keeps the thread', async () => {
    const getItem = vi.fn(() => 'e3b0c442-98fc-4c14-9afb-f4c8996fb924');
    const setItem = vi.fn();
    vi.stubGlobal('sessionStorage', { getItem, setItem });
    const sessionId = await freshSessionId();
    expect(sessionId()).toBe('e3b0c442-98fc-4c14-9afb-f4c8996fb924');
    expect(getItem).toHaveBeenCalledWith('duncit_log_session');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('persists a freshly minted id into sessionStorage', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('sessionStorage', { getItem: vi.fn(() => null), setItem });
    const sessionId = await freshSessionId();
    const id = sessionId();
    expect(setItem).toHaveBeenCalledWith('duncit_log_session', id);
  });

  it('still yields a stable in-memory id when sessionStorage throws (private-mode Safari)', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(() => {
        throw new Error('QuotaExceededError: private mode');
      }),
      setItem: vi.fn(),
    });
    const sessionId = await freshSessionId();
    const id = sessionId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionId()).toBe(id);
  });

  it('falls back to a time+random id when crypto.randomUUID is missing (old Safari / RN JSC)', async () => {
    vi.stubGlobal('crypto', {});
    vi.spyOn(Date, 'now').mockReturnValue(1756233000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const sessionId = await freshSessionId();
    const expected = `s-${(1756233000000).toString(36)}-${(0.123456789).toString(36).slice(2, 10)}`;
    expect(sessionId()).toBe(expected);
  });
});
