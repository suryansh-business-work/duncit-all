import { describe, expect, it } from 'vitest';

import { htmlToText, normalizedEditorHtml } from '../src/html';

describe('htmlToText', () => {
  it('keeps the readable text and drops the markup', () => {
    expect(htmlToText('<p>Sunday <strong>Badminton</strong> at 7</p>')).toBe('Sunday Badminton at 7');
  });

  it('turns the editor’s non-breaking spaces back into ordinary ones', () => {
    expect(htmlToText('<p>Court 2 · Indiranagar</p>')).toBe('Court 2 · Indiranagar');
  });

  it('trims the whitespace an editor leaves around a paragraph', () => {
    expect(htmlToText('<p>  padded  </p>')).toBe('padded');
  });

  it('flattens nested blocks into their text', () => {
    expect(htmlToText('<ul><li>One</li><li>Two</li></ul>')).toBe('OneTwo');
  });

  it('drops a tag that carries no text at all', () => {
    expect(htmlToText('<p><br /></p>')).toBe('');
    expect(htmlToText('<img src="x" alt="ignored" />')).toBe('');
  });

  it('returns an empty string for empty input rather than touching the DOM', () => {
    expect(htmlToText('')).toBe('');
  });

  it('does not execute script content it is handed', () => {
    // innerHTML never runs a <script>; the companion text must not contain it either.
    expect(htmlToText('<p>safe</p><script>window.pwned = true;</script>')).toBe('safe');
    expect((globalThis as Record<string, unknown>).pwned).toBeUndefined();
  });
});

describe('normalizedEditorHtml', () => {
  it('treats the editor’s empty-document markup as empty, so a blank field is not "authored"', () => {
    expect(normalizedEditorHtml('<p></p>')).toBe('');
  });

  it('leaves any real content alone', () => {
    expect(normalizedEditorHtml('<p>Real</p>')).toBe('<p>Real</p>');
    expect(normalizedEditorHtml('')).toBe('');
    expect(normalizedEditorHtml('<p> </p>')).toBe('<p> </p>');
  });
});
