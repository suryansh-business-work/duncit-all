import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, shareOrCopy } from '../../lib/clipboard';

const setClipboard = (writeText: ((text: string) => Promise<void>) | undefined) => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined });
};
const setShare = (share: ((data: ShareData) => Promise<void>) | undefined) => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(navigator, 'share');
});

describe('copyText', () => {
  it('writes the text to the clipboard and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    await expect(copyText('ABC123')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('ABC123');
  });

  it('answers false when the browser refuses', async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    await expect(copyText('ABC123')).resolves.toBe(false);
  });

  it('answers false where there is no clipboard at all (an insecure page)', async () => {
    setClipboard(undefined);
    await expect(copyText('ABC123')).resolves.toBe(false);
  });
});

describe('shareOrCopy', () => {
  it('uses the device share sheet when there is one, without touching the clipboard', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    setClipboard(writeText);
    await expect(shareOrCopy('Garden Party', 'https://lite.example/e/garden-party')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Garden Party', url: 'https://lite.example/e/garden-party' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link when the reader closes the share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setShare(vi.fn().mockRejectedValue(new Error('AbortError')));
    setClipboard(writeText);
    await expect(shareOrCopy('Garden Party', 'https://lite.example/e/garden-party')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://lite.example/e/garden-party');
  });

  it('copies the link where there is no share sheet', async () => {
    setShare(undefined);
    setClipboard(vi.fn().mockResolvedValue(undefined));
    await expect(shareOrCopy('Garden Party', 'https://lite.example/e/garden-party')).resolves.toBe('copied');
  });

  it('reports a failure when neither sharing nor copying worked', async () => {
    setShare(undefined);
    setClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    await expect(shareOrCopy('Garden Party', 'https://lite.example/e/garden-party')).resolves.toBe('failed');
  });
});
