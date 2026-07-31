import { describe, expect, it, vi, afterEach } from 'vitest';
import { copyToClipboard } from '../src/clipboard';

const withClipboard = (clipboard: unknown) => {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  });
};

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, 'clipboard');
});

describe('copyToClipboard', () => {
  it('copies the text and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withClipboard({ writeText });
    expect(await copyToClipboard('https://duncit.com/aB3xY9Zq')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://duncit.com/aB3xY9Zq');
  });

  // Insecure origins have no clipboard at all — the caller must not claim it
  // copied something that never left the page.
  it('reports failure when the browser offers no clipboard', async () => {
    withClipboard(undefined);
    expect(await copyToClipboard('x')).toBe(false);
  });

  it('reports failure when the write is rejected', async () => {
    withClipboard({ writeText: vi.fn().mockRejectedValue(new Error('not focused')) });
    expect(await copyToClipboard('x')).toBe(false);
  });
});
