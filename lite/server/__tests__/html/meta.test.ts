import { describe, expect, it } from 'vitest';
import { META_END, META_START, buildMetaTags, escapeHtml, injectMeta, jsonLdTag, type PageMeta } from '../../html/meta';

const page: PageMeta = {
  title: 'Sunday Jazz',
  description: 'Live jazz on the terrace',
  url: 'https://lite.duncit.com/e/sunday-jazz',
  siteName: 'Duncit Lite',
};

const SHELL = `<html><head>\n    ${META_START}\n    <title>Duncit Lite</title>\n    ${META_END}\n  </head><body></body></html>`;

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
  });
});

describe('buildMetaTags', () => {
  it('writes the title with the site name, the description, canonical link and Open Graph tags', () => {
    const tags = buildMetaTags(page);
    expect(tags).toContain('<title>Sunday Jazz | Duncit Lite</title>');
    expect(tags).toContain('<meta name="description" content="Live jazz on the terrace" />');
    expect(tags).toContain('<link rel="canonical" href="https://lite.duncit.com/e/sunday-jazz" />');
    expect(tags).toContain('<meta property="og:type" content="website" />');
    expect(tags).toContain('<meta property="og:title" content="Sunday Jazz" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary" />');
    expect(tags).not.toContain('og:image');
    expect(tags).not.toContain('robots');
  });

  it('does not repeat the site name when the title already carries it', () => {
    expect(buildMetaTags({ ...page, title: 'Discover events · duncit lite' })).toContain('<title>Discover events · duncit lite</title>');
  });

  it('adds image tags with a large card, the article type and noindex when asked', () => {
    const tags = buildMetaTags({ ...page, imageUrl: 'https://ik.imagekit.io/cover.png?w=1&h=2', type: 'article', noindex: true });
    expect(tags).toContain('<meta property="og:image" content="https://ik.imagekit.io/cover.png?w=1&amp;h=2" />');
    expect(tags).toContain('<meta name="twitter:image" content="https://ik.imagekit.io/cover.png?w=1&amp;h=2" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(tags).toContain('<meta property="og:type" content="article" />');
    expect(tags).toContain('<meta name="robots" content="noindex" />');
  });

  it('escapes text a host typed, so it cannot break out of an attribute', () => {
    const tags = buildMetaTags({ ...page, title: '"><script>alert(1)</script>', description: 'a "quoted" <b>' });
    expect(tags).not.toContain('<script>');
    expect(tags).toContain('content="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(tags).toContain('content="a &quot;quoted&quot; &lt;b&gt;"');
  });
});

describe('injectMeta', () => {
  it('replaces whatever sits between the markers', () => {
    const html = injectMeta(SHELL, '<title>Sunday Jazz</title>');
    expect(html).toContain(`${META_START}\n    <title>Sunday Jazz</title>\n    ${META_END}`);
    expect(html).not.toContain('<title>Duncit Lite</title>');
  });

  it('leaves a page without both markers, or with them out of order, unchanged', () => {
    expect(injectMeta('<html><head></head></html>', '<title>x</title>')).toBe('<html><head></head></html>');
    expect(injectMeta(`<head>${META_START}</head>`, '<title>x</title>')).toBe(`<head>${META_START}</head>`);
    const reversed = `<head>${META_END}${META_START}</head>`;
    expect(injectMeta(reversed, '<title>x</title>')).toBe(reversed);
  });
});

describe('jsonLdTag', () => {
  it('writes JSON-LD that a value carrying </script> cannot close', () => {
    const tag = jsonLdTag({ '@type': 'Event', name: 'Jazz </script><script>alert(1)</script>' });
    expect(tag.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(tag.endsWith('</script>')).toBe(true);
    const inner = tag.slice('<script type="application/ld+json">'.length, -'</script>'.length);
    expect(inner).not.toContain('<');
    expect(JSON.parse(inner)).toEqual({ '@type': 'Event', name: 'Jazz </script><script>alert(1)</script>' });
  });
});
