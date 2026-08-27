/**
 * The 4 MB cap is a client-side policy — the server only stores the URL — so a
 * surface that measures it differently accepts a file the next one refuses.
 * These pin the measurement, including the base64 fallback the native pickers
 * fall back to when they report no size.
 */
import { describe, expect, it } from 'vitest';

import { base64ByteSize, DOCUMENT_ACCEPT, isDocumentTooLarge, MAX_DOC_BYTES } from '../src';

describe('MAX_DOC_BYTES', () => {
  it('is 4 MB', () => {
    expect(MAX_DOC_BYTES).toBe(4 * 1024 * 1024);
  });
});

describe('DOCUMENT_ACCEPT', () => {
  it('takes an image or a PDF, which is what the server folder expects', () => {
    expect(DOCUMENT_ACCEPT).toBe('image/*,application/pdf');
  });
});

describe('base64ByteSize', () => {
  it('reads 3 bytes out of every 4 characters', () => {
    expect(base64ByteSize('')).toBe(0);
    expect(base64ByteSize('abcd')).toBe(3);
    expect(base64ByteSize('a'.repeat(400))).toBe(300);
  });
});

describe('isDocumentTooLarge', () => {
  it('uses the reported size when the picker gave one', () => {
    expect(isDocumentTooLarge({ size: MAX_DOC_BYTES })).toBe(false);
    expect(isDocumentTooLarge({ size: MAX_DOC_BYTES + 1 })).toBe(true);
  });

  it('prefers the reported size over the payload', () => {
    // A small reported size wins even though the base64 blob is over the cap —
    // the picker measured the file, the string is only a fallback.
    expect(isDocumentTooLarge({ size: 10, base64: 'a'.repeat(MAX_DOC_BYTES * 2) })).toBe(false);
  });

  it('falls back to measuring the base64 payload', () => {
    const under = 'a'.repeat(4);
    const over = 'a'.repeat(Math.ceil(((MAX_DOC_BYTES + 1024) * 4) / 3));
    expect(isDocumentTooLarge({ base64: under })).toBe(false);
    expect(isDocumentTooLarge({ base64: over })).toBe(true);
  });

  it('lets an unmeasurable document through — that is the picker failing, not the user', () => {
    expect(isDocumentTooLarge({})).toBe(false);
    expect(isDocumentTooLarge({ size: null })).toBe(false);
  });
});
