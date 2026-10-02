import { describe, expect, it, vi } from 'vitest';
import { fireAndForget } from '../src/fire-and-forget';
import type { LevelFns } from '../src/types';

const logger = (): LevelFns => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('fireAndForget', () => {
  it('logs a rejection against the caller page and component', async () => {
    const log = logger();
    const error = new Error('Payment gateway timed out');
    fireAndForget(Promise.reject(error), log, 'CheckoutPage', 'payNow');
    await vi.waitFor(() => expect(log.error).toHaveBeenCalledWith('CheckoutPage', 'payNow', { error }));
  });

  it('logs nothing when the promise resolves', async () => {
    const log = logger();
    const done = Promise.resolve('DUN-POD-4821');
    fireAndForget(done, log, 'PodDetailsPage', 'join');
    await done;
    await Promise.resolve();
    expect(log.error).not.toHaveBeenCalled();
  });
});
