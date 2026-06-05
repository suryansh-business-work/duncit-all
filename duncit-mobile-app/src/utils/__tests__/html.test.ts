import { stripHtml } from '@/utils/html';

describe('stripHtml', () => {
  it('returns an empty string for nullish input', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
  });

  it('converts block close tags to paragraph breaks and strips inline tags', () => {
    expect(stripHtml('<p>Hello</p><div>World</div>')).toBe('Hello\n\nWorld');
    expect(stripHtml('<h1>Title</h1><li>Item</li>')).toBe('Title\n\nItem');
  });

  it('decodes &nbsp; and collapses excess blank lines', () => {
    expect(stripHtml('<p>a</p><p></p><p></p><p>b</p>')).toBe('a\n\nb');
    expect(stripHtml('a&nbsp;b')).toBe('a b');
  });
});
