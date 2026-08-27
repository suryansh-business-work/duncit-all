import { describe, expect, it, vi } from 'vitest';

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

  it('never hands back null, even when the DOM node reports no text at all', () => {
    const blank = { innerHTML: '', textContent: null } as unknown as HTMLDivElement;
    const createElement = vi.spyOn(document, 'createElement').mockReturnValueOnce(blank);

    expect(htmlToText('<p>Doubles</p>')).toBe('');
    expect(createElement).toHaveBeenCalledWith('div');
  });

  it('does not execute script content it is handed', () => {
    // innerHTML never runs a <script>: the readable text survives, the code never runs.
    expect(htmlToText('<p>safe</p><script>window.pwned = true;</script>')).toContain('safe');
    expect((globalThis as Record<string, unknown>).pwned).toBeUndefined();
  });

  // SRC GAP (src/html.ts:6): the companion text must not contain script bodies either,
  // but `element.textContent` keeps the text inside <script>/<style> elements, so JS
  // source leaks into the stored searchable companion. Flip to `it` once htmlToText
  // removes those nodes before reading textContent.
  it.fails('strips script bodies from the companion text', () => {
    expect(htmlToText('<p>safe</p><script>window.pwned = true;</script>')).toBe('safe');
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
