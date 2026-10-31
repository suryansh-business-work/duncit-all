/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  blockQuery,
  CENTER_SCROLL,
  ctaBandLine,
  expectMainSite404,
  fetchHtml,
  interceptQuery,
  metaContent,
  siteBranding,
  siteUrl,
  visitSite,
  websiteCopy,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * duncit.com/blog (WebsiteContentList "cards"), /blog/<slug> (pages/blog/
 * post.astro: body + Suggested, Related and Archive, plus the per-request card
 * server/page-meta.ts blogPostMeta writes; the old /blog/post?slug= address
 * redirects there) and /newsroom (variant "news"), all read live from the
 * Website portal's content.
 */

/** src/lib/blog-path.ts blogPostPath: where a post lives. */
const postPath = (slug: string): string => `/blog/${encodeURIComponent(slug)}`;

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  cta_url?: string | null;
}

const CONTENT = `query E2eWebsiteContent($type: WebsitePageType!) {
  publicWebsiteContent(type: $type) { id title slug summary category image_url published_at cta_url }
}`;

const monthLabel = (iso: string): { key: string; label: string } => {
  const d = new Date(iso);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(d.getFullYear(), d.getMonth(), 1));
  return { key, label };
};

describe('UI duncit.com · Blog and newsroom', CENTER_SCROLL, () => {
  let t: Translator['t'];
  let branding: SiteBranding;

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
    siteBranding().then((found) => {
      branding = found;
    });
  });

  describe('blog', () => {
    let posts: Post[];

    before(() => {
      cy.gql<{ publicWebsiteContent: Post[] }>(CONTENT, { type: 'BLOG' }, { token: null }).then((data) => {
        posts = data.publicWebsiteContent;
        if (!posts.length) throw new Error('Staging prerequisite: no BLOG post is published (Website portal > Blog).');
      });
    });

    it('BLOG-01 /blog shows one card per published post, each opening /blog/<slug>', () => {
      interceptQuery('publicWebsiteContent', 'blog');
      visitSite('main', '/blog');
      cy.wait('@blog');
      cy.get('[data-website-content-list] a[href^="/blog/"]').should('have.length', posts.length);
      for (const post of posts) {
        cy.get(`[data-website-content-list] a[href="${postPath(post.slug)}"]`).should('contain.text', post.title);
      }
      cy.get(`[data-website-content-list] a[href="${postPath(posts[0].slug)}"]`).click();
      cy.location('pathname').should('eq', postPath(posts[0].slug));
    });

    it('BLOG-02 a post retitles the page and lists Suggested, Related and a newest-first Archive from the same posts', () => {
      const [post] = posts;
      const others = posts.filter((p) => p.slug !== post.slug);
      const suggested = others.filter((p) => p.category && p.category === post.category).slice(0, 3);
      const related = others.filter((p) => !suggested.includes(p)).slice(0, 3);
      const months = new Map<string, { label: string; count: number }>();
      for (const p of posts) {
        if (!p.published_at) continue;
        const { key, label } = monthLabel(p.published_at);
        months.set(key, { label, count: (months.get(key)?.count ?? 0) + 1 });
      }
      const archive = [...months.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, value]) => value);

      visitSite('main', `/blog/post?slug=${encodeURIComponent(post.slug)}`);
      cy.get('[data-page-heading]').should('readText', post.title);
      cy.title().should('eq', `${post.title} — Duncit Blog`);
      cy.get('#postBody .skeleton').should('not.exist');
      if (post.category) cy.get('#postBody').should('contain.text', post.category);
      if (post.image_url) cy.get('#postBody img').should('have.attr', 'src', post.image_url);

      if (suggested.length) cy.get('#suggestedPosts a').should('have.length', suggested.length);
      else cy.get('#suggestedPosts').should('readText', 'No other posts in this category yet.');
      if (related.length) cy.get('#relatedPosts a').should('have.length', related.length);
      else cy.get('#relatedPosts').should('readText', 'More posts coming soon.');
      cy.get('#postArchive a').should('have.length', archive.length);
      archive.forEach((month, index) => {
        cy.get('#postArchive a').eq(index).should('contain.text', month.label).and('contain.text', String(month.count));
      });
    });

    it('BLOG-03 the server writes the post\'s own card into /blog/post?slug= for crawlers', () => {
      const [post] = posts;
      fetchHtml(siteUrl('main', `/blog/post?slug=${encodeURIComponent(post.slug)}`)).then(({ status, doc }) => {
        expect(status).to.eq(200);
        expect(metaContent(doc, 'meta[property="og:title"]')).to.eq(post.title);
        expect(metaContent(doc, 'meta[property="og:type"]')).to.eq('article');
        expect(metaContent(doc, 'meta[name="twitter:card"]')).to.eq(post.image_url ? 'summary_large_image' : 'summary');
      });
    });

    it('BLOG-04 an unknown slug is a real 404 with the site 404 page, and its old ?slug= address lands there too', () => {
      fetchHtml(siteUrl('main', postPath('e2e-no-such-post'))).then(({ status, doc }) => {
        expect(status).to.eq(404);
        expectMainSite404(doc, postPath('e2e-no-such-post'));
      });
      visitSite('main', '/blog/post?slug=e2e-no-such-post', { failOnStatusCode: false });
      cy.location('pathname').should('eq', postPath('e2e-no-such-post'));
      cy.contains('main p', t('website.main.notFound.text')).should('exist');
    });

    it('BLOG-05 /blog/post with no slug goes back to /blog', () => {
      visitSite('main', '/blog/post');
      cy.location('pathname').should('eq', '/blog');
    });

    it('BLOG-06 an unreachable API leaves the post body saying it could not be loaded', () => {
      blockQuery('publicWebsiteContent');
      visitSite('main', `/blog/post?slug=${encodeURIComponent(posts[0].slug)}`);
      cy.get('#postBody').should('readText', t('website.main.blogPost.error'));
    });
  });

  it('NEWS-01 the newsroom lists NEWSROOM entries (category, title, summary, CTA link) or says none are published', () => {
    cy.gql<{ publicWebsiteContent: Post[] }>(CONTENT, { type: 'NEWSROOM' }, { token: null }).then(({ publicWebsiteContent: items }) => {
      interceptQuery('publicWebsiteContent', 'news');
      visitSite('main', '/newsroom');
      cy.wait('@news');
      if (!items.length) {
        cy.get('[data-website-content-list]').should('readText', t('website.main.contentList.empty'));
        return;
      }
      cy.get('[data-website-content-list] a').should('have.length', items.length);
      items.forEach((item, index) => {
        cy.get('[data-website-content-list] a').eq(index).then(($row) => {
          expect($row.text()).to.contain(item.title);
          if (item.summary) expect($row.text()).to.contain(item.summary);
          if (item.category) expect($row.text()).to.contain(item.category);
          const raw = String(item.cta_url ?? '').trim();
          const safe = /^https?:\/\//i.test(raw) ? new URL(raw).toString() : '#';
          expect($row.attr('href')).to.eq(/^(mailto:|tel:)/i.test(raw) ? raw : safe);
        });
      });
    });
  });

  it('NEWS-02 the press paragraph links the support email', () => {
    visitSite('main', '/newsroom');
    ctaBandLine(t('website.main.newsroom.press'))
      .find(`a[href="mailto:${branding.support_email}"]`)
      .should('readText', branding.support_email);
  });
});
