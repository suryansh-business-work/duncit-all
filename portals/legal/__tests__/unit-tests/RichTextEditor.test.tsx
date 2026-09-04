import { describe, expect, it } from 'vitest';
import { DuncitRichTextInput, htmlToText as packageHtmlToText } from '@duncit/rich-text';
import RichTextEditor, { htmlToText, toPrintableHtml } from '../../src/components/RichTextEditor';

/**
 * This module is a compatibility shim: the editor itself lives in
 * `@duncit/rich-text`, which owns its own suite. What is worth pinning HERE is
 * that the shim still points at that one implementation — an older import path
 * quietly resolving to a second editor is the drift this file exists to catch —
 * plus the printable wrapper, which is this portal's own.
 */
describe('RichTextEditor re-export', () => {
  it('is the shared editor, not a second implementation', () => {
    expect(RichTextEditor).toBe(DuncitRichTextInput);
    expect(htmlToText).toBe(packageHtmlToText);
  });
});

describe('htmlToText', () => {
  it('returns empty for empty input', () => {
    expect(htmlToText('')).toBe('');
  });

  it('strips tags and decodes entities', () => {
    expect(htmlToText('<p>Hello &amp; bye</p>')).toBe('Hello & bye');
  });

  it('handles markup with no text', () => {
    expect(htmlToText('<br>')).toBe('');
  });
});

describe('toPrintableHtml', () => {
  it('wraps content in a printable document with the title', () => {
    const html = toPrintableHtml('Privacy Policy', '<p>Body</p>');
    expect(html).toContain('<title>Privacy Policy</title>');
    expect(html).toContain('<h1>Privacy Policy</h1>');
    expect(html).toContain('<p>Body</p>');
  });

  // A policy is a legal document that gets downloaded and kept: the title has
  // to survive being one, and it must not be able to close the tag it sits in.
  it('escapes a title that contains markup rather than rendering it', () => {
    const html = toPrintableHtml('Terms <b>& Conditions</b>', '');
    expect(html).toContain('<title>Terms &lt;b&gt;&amp; Conditions&lt;/b&gt;</title>');
    expect(html).not.toContain('<b>');
  });

  it('produces a complete document even with no content at all', () => {
    const html = toPrintableHtml('Empty', '');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<h1>Empty</h1>');
    expect(html).toContain('</body></html>');
  });
});
