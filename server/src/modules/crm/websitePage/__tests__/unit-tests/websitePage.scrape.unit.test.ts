import { extractContent, normaliseSite } from '../../websitePage.scrape';

describe('websitePage.scrape helpers', () => {
  describe('normaliseSite', () => {
    it('adds https:// when missing and validates', () => {
      expect(normaliseSite('example.com')).toBe('https://example.com/');
      expect(normaliseSite('http://foo.test/path')).toBe('http://foo.test/path');
    });
    it('returns null for empty / invalid input', () => {
      expect(normaliseSite('')).toBeNull();
      expect(normaliseSite('   ')).toBeNull();
      expect(normaliseSite(null)).toBeNull();
    });
  });

  describe('extractContent', () => {
    it('pulls the title and strips scripts/styles/tags', () => {
      const html = `
        <html><head><title>My &amp; Page</title><style>.x{color:red}</style></head>
        <body><script>var a=1;</script><h1>Hello</h1><p>World&nbsp;text</p></body></html>`;
      const { title, text } = extractContent(html);
      expect(title).toBe('My & Page');
      expect(text).toContain('Hello');
      expect(text).toContain('World text');
      expect(text).not.toContain('var a=1');
      expect(text).not.toContain('color:red');
    });
    it('handles missing title', () => {
      expect(extractContent('<body>hi</body>').title).toBeNull();
    });
  });
});
