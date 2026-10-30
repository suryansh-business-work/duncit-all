import { describe, expect, it } from 'vitest';
import {
  ROBOTS_HEADERS,
  SITEMAP_HEADERS,
  buildOrganizationJsonLd,
  buildRobotsTxt,
  buildSitemapXml,
  buildWebSiteJsonLd,
  routesFromPageFiles,
  serializeJsonLd,
} from '../src/seo';
import { DUNCIT_SOCIAL_URLS } from '../src/social-accounts';

describe('buildRobotsTxt', () => {
  it('opens the site to every crawler and names its sitemap, without a doubled slash', () => {
    expect(buildRobotsTxt('https://duncit.com/')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://duncit.com/sitemap.xml\n'
    );
  });

  it('lists each disallowed path before the sitemap', () => {
    const robots = buildRobotsTxt('https://duncit.com', ['/policy/_reader', '/private']);
    expect(robots).toContain('Allow: /\nDisallow: /policy/_reader\nDisallow: /private\n');
    expect(robots.trimEnd().endsWith('Sitemap: https://duncit.com/sitemap.xml')).toBe(true);
  });

  it('is served as plain text', () => {
    expect(ROBOTS_HEADERS['content-type']).toBe('text/plain; charset=utf-8');
  });
});

describe('buildSitemapXml', () => {
  it('writes one url per entry, with lastmod only when it is known', () => {
    const xml = buildSitemapXml([
      { loc: 'https://duncit.com/' },
      { loc: 'https://duncit.com/blog/a', lastmod: '2026-04-14T00:00:00.000Z' },
      { loc: 'https://duncit.com/blog/b', lastmod: null },
    ]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?><urlset')).toBe(true);
    expect(xml).toContain('<url><loc>https://duncit.com/</loc></url>');
    expect(xml).toContain('<url><loc>https://duncit.com/blog/a</loc><lastmod>2026-04-14T00:00:00.000Z</lastmod></url>');
    expect(xml).toContain('<url><loc>https://duncit.com/blog/b</loc></url>');
  });

  it('escapes characters XML cannot carry raw', () => {
    const xml = buildSitemapXml([{ loc: `https://duncit.com/blog/post?slug=a&b<'">` }]);
    expect(xml).toContain('<loc>https://duncit.com/blog/post?slug=a&amp;b&lt;&apos;&quot;&gt;</loc>');
  });

  it('is an empty urlset when there are no pages', () => {
    expect(buildSitemapXml([])).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  });

  it('is served as XML', () => {
    expect(SITEMAP_HEADERS['content-type']).toBe('application/xml; charset=utf-8');
  });
});

describe('routesFromPageFiles', () => {
  const files = [
    './index.astro',
    './about.astro',
    './safety/index.astro',
    './safety/tools.astro',
    './404.astro',
    './500.astro',
    './policy/[slug].astro',
    './_draft.astro',
    './blog/post.astro',
  ];

  it('turns page files into the slash-ended addresses Astro canonicalises, sorted', () => {
    expect(routesFromPageFiles(files)).toEqual(['/', '/about/', '/blog/post/', '/safety/', '/safety/tools/']);
  });

  it('leaves out error pages, dynamic routes, underscore files and the excluded paths', () => {
    const routes = routesFromPageFiles(files, ['/blog/post/']);
    expect(routes).not.toContain('/404/');
    expect(routes).not.toContain('/500/');
    expect(routes.some((route) => route.includes('['))).toBe(false);
    expect(routes.some((route) => route.includes('_'))).toBe(false);
    expect(routes).not.toContain('/blog/post/');
  });
});

describe('buildOrganizationJsonLd', () => {
  it('names the company once, with its logo, profiles and support contact', () => {
    expect(
      buildOrganizationJsonLd({
        name: 'Duncit',
        url: 'https://duncit.com/',
        logoUrl: 'https://cdn.example/logo.png',
        email: 'help@duncit.com',
        phone: '+91 00000 00000',
        sameAs: Object.values(DUNCIT_SOCIAL_URLS),
      })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://duncit.com/#organization',
      name: 'Duncit',
      url: 'https://duncit.com/',
      logo: 'https://cdn.example/logo.png',
      sameAs: Object.values(DUNCIT_SOCIAL_URLS),
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'help@duncit.com',
        telephone: '+91 00000 00000',
      },
    });
  });

  it('omits what branding has not filled in rather than writing empty values', () => {
    const bare = buildOrganizationJsonLd({ name: 'Duncit', url: 'https://duncit.com', logoUrl: null, sameAs: [] });
    expect(bare).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://duncit.com/#organization',
      name: 'Duncit',
      url: 'https://duncit.com',
    });
  });

  it('writes a contact point with only the channel that exists', () => {
    const emailOnly = buildOrganizationJsonLd({ name: 'Duncit', url: 'https://duncit.com', email: 'help@duncit.com' });
    expect(emailOnly.contactPoint).toEqual({ '@type': 'ContactPoint', contactType: 'customer support', email: 'help@duncit.com' });
    const phoneOnly = buildOrganizationJsonLd({ name: 'Duncit', url: 'https://duncit.com', phone: '+91 1' });
    expect(phoneOnly.contactPoint).toEqual({ '@type': 'ContactPoint', contactType: 'customer support', telephone: '+91 1' });
  });
});

describe('buildWebSiteJsonLd', () => {
  it('points a subdomain at the company node on duncit.com', () => {
    expect(
      buildWebSiteJsonLd({ name: 'Duncit Ads', url: 'https://ads.duncit.com', organizationUrl: 'https://duncit.com/' })
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Duncit Ads',
      url: 'https://ads.duncit.com',
      publisher: { '@id': 'https://duncit.com/#organization' },
    });
  });
});

describe('serializeJsonLd', () => {
  it('round-trips as JSON but can never close the script tag it sits in', () => {
    const data = { name: '</script><script>alert(1)</script>' };
    const json = serializeJsonLd(data);
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toEqual(data);
  });

  it('serialises a list of nodes', () => {
    expect(JSON.parse(serializeJsonLd([{ a: 1 }, { b: 2 }]))).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe('DUNCIT_SOCIAL_URLS', () => {
  it('lists only https profile addresses', () => {
    const urls = Object.values(DUNCIT_SOCIAL_URLS);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.startsWith('https://'))).toBe(true);
  });
});
