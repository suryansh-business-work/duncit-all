import { describe, expect, it } from 'vitest';
import { fileToBase64 } from '@/utils/fileToBase64';

describe('fileToBase64', () => {
  it('strips the data-URL prefix and returns bare base64', async () => {
    const file = new File(['hello'], 'hi.txt', { type: 'text/plain' });
    const b64 = await fileToBase64(file);
    // "hello" → aGVsbG8= ; the data: prefix must be gone.
    expect(b64).toBe('aGVsbG8=');
    expect(b64.startsWith('data:')).toBe(false);
  });
});
