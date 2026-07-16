import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileToBase64, fileToDataUrl } from '../src/file-to-base64';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Minimal FileReader stand-in for the branches a real reader cannot hit. */
class StubReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error: DOMException | null = null;
  result: string | ArrayBuffer | null = null;

  constructor(
    private readonly outcome: { result?: string | ArrayBuffer | null; error?: DOMException | null; fail?: boolean },
  ) {}

  readAsDataURL(): void {
    queueMicrotask(() => {
      if (this.outcome.fail) {
        this.error = this.outcome.error ?? null;
        this.onerror?.();
        return;
      }
      this.result = this.outcome.result ?? null;
      this.onload?.();
    });
  }
}

const stubReader = (outcome: ConstructorParameters<typeof StubReader>[0]) => {
  vi.stubGlobal(
    'FileReader',
    class extends StubReader {
      constructor() {
        super(outcome);
      }
    },
  );
};

describe('fileToDataUrl', () => {
  it('resolves the full data URL for a real file', async () => {
    const url = await fileToDataUrl(new File(['hello'], 'hello.txt', { type: 'text/plain' }));
    expect(url).toBe(`data:text/plain;base64,${btoa('hello')}`);
  });

  it('resolves an empty string when the reader yields a non-string result', async () => {
    stubReader({ result: null });
    await expect(fileToDataUrl(new File(['x'], 'x.bin'))).resolves.toBe('');
  });

  it('rejects with the reader error when reading fails', async () => {
    const domError = new Error('denied') as unknown as DOMException;
    stubReader({ fail: true, error: domError });
    await expect(fileToDataUrl(new File(['x'], 'x.bin'))).rejects.toBe(domError);
  });

  it('rejects with a fallback Error when the reader has no error', async () => {
    stubReader({ fail: true });
    await expect(fileToDataUrl(new File(['x'], 'x.bin'))).rejects.toThrow(
      'Could not read selected file',
    );
  });
});

describe('fileToBase64', () => {
  it('strips the data-URL prefix', async () => {
    const b64 = await fileToBase64(new File(['hello'], 'hello.txt', { type: 'text/plain' }));
    expect(b64).toBe(btoa('hello'));
  });

  it('returns the raw result when it contains no comma', async () => {
    stubReader({ result: 'not-a-data-url' });
    await expect(fileToBase64(new File(['x'], 'x.bin'))).resolves.toBe('not-a-data-url');
  });
});
