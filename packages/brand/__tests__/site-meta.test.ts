import { describe, expect, it } from 'vitest';
import { META_END, META_START, buildSiteMetaTags, injectSiteMeta, type SiteMetaInput } from '../src/site-meta';

const base: SiteMetaInput = {
  title: 'Careers',
  description: 'Work with us',
  url: 'https://duncit.com/careers',
  siteName: 'Duncit',
};

describe('buildSiteMetaTags', () => {
  it('suffixes the site name and shares the page title and description by default', () => {
    const tags = buildSiteMetaTags(base);
    expect(tags).toContain('<title>Careers | Duncit</title>');
    expect(tags).toContain('<meta property="og:title" content="Careers" />');
    expect(tags).toContain('<meta name="twitter:description" content="Work with us" />');
    expect(tags).toContain('<meta property="og:type" content="website" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary" />');
    expect(tags).not.toContain('og:image');
  });

  it('does not repeat a site name the title already carries', () => {
    expect(buildSiteMetaTags({ ...base, title: 'Duncit Careers' })).toContain('<title>Duncit Careers</title>');
  });

  it('uses the share card copy when given, escaped', () => {
    const tags = buildSiteMetaTags({ ...base, socialTitle: 'Join "us"', socialDescription: 'Pods & people' });
    expect(tags).toContain('<meta property="og:title" content="Join &quot;us&quot;" />');
    expect(tags).toContain('<meta name="twitter:title" content="Join &quot;us&quot;" />');
    expect(tags).toContain('<meta property="og:description" content="Pods &amp; people" />');
    // The search title stays the page's own.
    expect(tags).toContain('<title>Careers | Duncit</title>');
  });

  it('takes the wide card for a page with its own image, unless one is forced', () => {
    const own = { ...base, imageUrl: 'https://cdn.example/a.png', largeImage: true };
    expect(buildSiteMetaTags(own)).toContain('content="summary_large_image"');
    expect(buildSiteMetaTags({ ...own, twitterCard: 'summary' })).toContain('<meta name="twitter:card" content="summary" />');
    expect(buildSiteMetaTags({ ...base, twitterCard: 'summary_large_image' })).toContain('content="summary_large_image"');
  });

  it('adds the image tags and the article type', () => {
    const tags = buildSiteMetaTags({ ...base, imageUrl: 'https://cdn.example/a.png', type: 'article' });
    expect(tags).toContain('<meta property="og:image" content="https://cdn.example/a.png" />');
    expect(tags).toContain('<meta name="twitter:image" content="https://cdn.example/a.png" />');
    expect(tags).toContain('<meta property="og:type" content="article" />');
  });
});

describe('injectSiteMeta', () => {
  it('replaces the marker block', () => {
    const html = `<head>${META_START}<title>old</title>${META_END}</head>`;
    const out = injectSiteMeta(html, '<title>new</title>');
    expect(out).toContain('<title>new</title>');
    expect(out).not.toContain('old');
  });

  it('leaves a page without (or with reversed) markers untouched', () => {
    expect(injectSiteMeta('<head></head>', 'x')).toBe('<head></head>');
    expect(injectSiteMeta(`${META_END}${META_START}`, 'x')).toBe(`${META_END}${META_START}`);
  });
});
