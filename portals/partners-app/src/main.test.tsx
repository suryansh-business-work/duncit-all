import { afterEach, describe, expect, it, vi } from 'vitest';

const mountPortal = vi.fn();
const createSessionUserLoader = vi.fn(() => 'session-loader');

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  mountPortal,
}));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  createSessionUserLoader,
}));
// The app itself is the route table; mounting it is what the shell does with `children`.
vi.mock('./App', () => ({ default: () => null }));

afterEach(() => {
  mountPortal.mockClear();
  vi.resetModules();
});

describe('main', () => {
  it('mounts the partners portal once, with its own config, accent, storage key and session query', async () => {
    await import('./main');

    expect(mountPortal).toHaveBeenCalledTimes(1);
    const options = mountPortal.mock.calls[0][0];
    expect(options.config.fullName).toBeTruthy();
    expect(options.config.accent).toBeTruthy();
    expect(options.userStorageKey).toBe('partner_user');
    expect(options.loadUser).toBe('session-loader');
    expect(createSessionUserLoader).toHaveBeenCalledWith(options.apolloClient, { operationName: 'PartnerSessionMe' });
    expect(options.graphqlUrl).toMatch(/^https?:\/\//);
    expect(options.i18nFallback).toBeTruthy();
    expect(options.children).toBeTruthy();
  });
});
