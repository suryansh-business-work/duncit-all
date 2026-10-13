import { vi } from 'vitest';

/** Let queued microtasks and zero-delay timers settle. */
export const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

/** Stub fetch to answer with `body`; returns the mock for call inspection. */
export function stubFetch(body: unknown) {
  const mock = vi.fn().mockResolvedValue({ json: async () => body });
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Stub fetch to reject (network failure). */
export function stubFetchReject(error: Error = new Error('network down')) {
  const mock = vi.fn().mockRejectedValue(error);
  vi.stubGlobal('fetch', mock);
  return mock;
}
