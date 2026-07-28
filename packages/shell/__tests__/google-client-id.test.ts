import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGoogleClientId, loadGoogleClientId, setGoogleClientId } from '../src/lib/google-client-id';
import type { MountPortalOptions } from '../src/types';

type Apollo = MountPortalOptions['apolloClient'];

const apolloReturning = (google_client_id: string | null) =>
  ({ query: vi.fn().mockResolvedValue({ data: { publicClientConfig: { google_client_id } } }) }) as unknown as Apollo;

afterEach(() => {
  setGoogleClientId('');
  vi.useRealTimers();
});

describe('google client id store', () => {
  it('trims what it stores and treats blank input as unset', () => {
    setGoogleClientId('  spaced-id  ');
    expect(getGoogleClientId()).toBe('spaced-id');
    setGoogleClientId(undefined);
    expect(getGoogleClientId()).toBe('');
  });

  it('takes the server value over the fallback', async () => {
    await expect(loadGoogleClientId(apolloReturning('from-tech-portal'), 'fallback-id')).resolves.toBe('from-tech-portal');
    expect(getGoogleClientId()).toBe('from-tech-portal');
  });

  it('falls back when the server has nothing configured', async () => {
    await expect(loadGoogleClientId(apolloReturning(null), 'fallback-id')).resolves.toBe('fallback-id');
  });

  it('resolves empty when neither the server nor a fallback has a value', async () => {
    await expect(loadGoogleClientId(apolloReturning(''))).resolves.toBe('');
  });

  it('falls back when the query fails', async () => {
    const apollo = { query: vi.fn().mockRejectedValue(new Error('offline')) } as unknown as Apollo;
    await expect(loadGoogleClientId(apollo, 'fallback-id')).resolves.toBe('fallback-id');
  });

  it('stops waiting on a hung server and uses the fallback', async () => {
    vi.useFakeTimers();
    const apollo = { query: vi.fn().mockReturnValue(new Promise(() => undefined)) } as unknown as Apollo;
    const pending = loadGoogleClientId(apollo, 'fallback-id');
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toBe('fallback-id');
  });
});
