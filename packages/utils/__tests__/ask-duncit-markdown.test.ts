/**
 * Answers are rendered from this parse on both apps, so it must never let
 * HTML or a non-web link through, and must keep lists and emphasis intact.
 */
import { describe, expect, it } from 'vitest';
import { markdownToPlainText, parseAnswerMarkdown, parseInline } from '../src/ask-duncit-markdown';

describe('parseInline', () => {
  it('reads bold, italic, code and a safe link in order', () => {
    expect(parseInline('Tap **Join**, then *wait* for `OTP` — [help](https://duncit.com/help).')).toEqual([
      { text: 'Tap ' },
      { text: 'Join', bold: true },
      { text: ', then ' },
      { text: 'wait', italic: true },
      { text: ' for ' },
      { text: 'OTP', code: true },
      { text: ' — ' },
      { text: 'help', href: 'https://duncit.com/help' },
      { text: '.' },
    ]);
  });

  it('keeps a javascript: or relative link as literal text', () => {
    expect(parseInline('[x](javascript:alert(1))')).toEqual([{ text: '[x](javascript:alert(1)' }, { text: ')' }]);
    expect(parseInline('[x](/pods)')).toEqual([{ text: '[x](/pods)' }]);
  });

  it('leaves HTML as text — nothing is ever rendered as markup', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ text: '<img src=x onerror=alert(1)>' }]);
  });
});

describe('parseAnswerMarkdown', () => {
  it('groups bullets and numbered items, and joins wrapped paragraph lines', () => {
    const blocks = parseAnswerMarkdown('## Your pods\nYou have two\npods this week.\n\n- Yoga\n- Chess\n\n1. Open the pod\n2. Tap Leave');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'bullets', 'numbered']);
    expect(blocks[1]).toEqual({ type: 'paragraph', spans: [{ text: 'You have two pods this week.' }] });
    expect(blocks[2]).toMatchObject({ items: [[{ text: 'Yoga' }], [{ text: 'Chess' }]] });
    expect(blocks[3]).toMatchObject({ start: 1, items: [[{ text: 'Open the pod' }], [{ text: 'Tap Leave' }]] });
  });

  it('handles empty input and CRLF', () => {
    expect(parseAnswerMarkdown('')).toEqual([]);
    expect(parseAnswerMarkdown('a\r\n\r\nb').map((b) => b.type)).toEqual(['paragraph', 'paragraph']);
  });

  it('gives plain text for read-aloud', () => {
    expect(markdownToPlainText('**Hi** [there](https://x.test)\n\n- one\n- two')).toBe('Hi there\n\none\ntwo');
  });

  it('treats a missing answer as empty', () => {
    expect(parseAnswerMarkdown(null)).toEqual([]);
    expect(markdownToPlainText(undefined)).toBe('');
  });
});
