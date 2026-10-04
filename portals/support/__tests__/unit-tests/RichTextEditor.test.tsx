import { describe, expect, it } from 'vitest';
import { DuncitRichTextInput, htmlToText as packageHtmlToText } from '@duncit/rich-text';
import RichTextEditor, { htmlToText } from '../../src/components/RichTextEditor';

/**
 * This module is a compatibility shim: the editor itself lives in
 * `@duncit/rich-text`, which owns its own suite (rendering, change forwarding,
 * minHeight, toolbar). What is worth pinning HERE is that the shim still points
 * at that one implementation — an older import path quietly resolving to a
 * second editor is the drift this file exists to catch.
 */
describe('RichTextEditor re-export', () => {
  it('is the shared editor, not a second implementation', () => {
    expect(RichTextEditor).toBe(DuncitRichTextInput);
    expect(htmlToText).toBe(packageHtmlToText);
  });
});

describe('htmlToText', () => {
  it('returns an empty string for empty input', () => {
    expect(htmlToText('')).toBe('');
  });

  it('strips HTML tags and decodes entities', () => {
    expect(htmlToText('<p>Hello &amp; bye</p>')).toBe('Hello & bye');
  });

  it('handles markup with no text content', () => {
    expect(htmlToText('<br>')).toBe('');
  });
});
