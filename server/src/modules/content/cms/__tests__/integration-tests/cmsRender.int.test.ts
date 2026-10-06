import { Types } from 'mongoose';
import { cmsRenderService, normaliseHost, normalisePath } from '../../cmsRender.service';
import { CmsPageModel } from '../../cmsPage.model';
import { content, makeEntry, makeFragment, makePage, makeSite, makeVersion } from './cms.fixtures';

const HOST = 'duncit.test';
const missingId = () => new Types.ObjectId().toHexString();

/** A component that is live: its published copy, and a different draft. */
const liveFragment = (siteId: unknown, key: string, live: ReturnType<typeof content>, draft = content(`<p>${key} draft</p>`)) =>
  makeFragment(siteId, { key, name: key, is_published: true, published: { ...live, version: 1 }, draft: { project: '', ...draft } });

/** A page that is live at `path`. */
const livePage = (siteId: unknown, path: string, live: ReturnType<typeof content>, over: Record<string, unknown> = {}) =>
  makePage(siteId, { path, title: `Title of ${path}`, is_published: true, published: { ...live, version: 1 }, ...over });

describe('host and path spelling', () => {
  it('reads a host the way a browser might send it', () => {
    expect(normaliseHost(' Duncit.COM:8080 ')).toBe('duncit.com');
    expect(normaliseHost('duncit.com.')).toBe('duncit.com');
  });

  it('gives every address one spelling', () => {
    expect(normalisePath('/Blog/Post/?utm=x#top')).toBe('/blog/post');
    expect(normalisePath('')).toBe('/');
  });
});

describe('cmsRenderService.render: a published page', () => {
  async function siteWithChrome() {
    const site = await makeSite({
      domains: [HOST],
      custom_css: '$pad: 4px;\nbody { padding: $pad; }',
      custom_js: 'window.site = 1;',
      design: { base_css: '$c: #111;\nhtml { color: $c; }', tokens: [], fonts: [], font_urls: [] },
      seo: { title: 'Duncit', description: 'Meet people', og_image_url: 'https://cdn.test/og.png' },
    });
    const head = await liveFragment(site._id, 'site-header', content('<nav>Nav</nav>', { scss: '.nav { a { color: red; } }', js: 'root.dataset.ready = "1";' }));
    const foot = await liveFragment(site._id, 'site-footer', content('<p>Foot</p>', { css: '.f { margin: 0; }' }));
    await site.updateOne({ header_fragment_id: head._id, footer_fragment_id: foot._id });
    return site;
  }

  it('composes header, page and footer, each component in its own scope', async () => {
    const site = await siteWithChrome();
    await liveFragment(site._id, 'hero', content('<h1>Hero</h1>', { css: '.t { color: blue; }', js: 'root.hidden = false;' }));
    await livePage(site._id, '/about', content('<cms-fragment data-key="hero"></cms-fragment><p>About</p>', { css: '.a { color: red; }', scss: '$m: 2px;\n.b { margin: $m; }', js: 'page();' }), {
      custom_css: '.custom { .x { top: 0; } }',
      custom_js: 'custom();',
      head_html: '<link rel="preload">',
    });

    const out = await cmsRenderService.render('DUNCIT.test:443', '/About/');
    expect(out.status).toBe(200);
    expect(out.title).toBe('Title of /about');
    expect(out.html).toBe(
      '<header data-cms-chrome="header"><div data-cms-fragment="site-header"><nav>Nav</nav></div></header>' +
        '<main id="main" data-cms-page><div data-cms-fragment="hero"><h1>Hero</h1></div><p>About</p></main>' +
        '<footer data-cms-chrome="footer"><div data-cms-fragment="site-footer"><p>Foot</p></div></footer>'
    );
    // Header, the page's own (visual + SCSS, compiled together), its components, footer, the page's custom CSS.
    expect(out.css.split('\n')).toEqual([
      '[data-cms-fragment=site-header] .nav a{color:red}',
      '.a{color:red}.b{margin:2px}',
      '[data-cms-fragment=hero] .t{color:blue}',
      '[data-cms-fragment=site-footer] .f{margin:0}',
      '.custom .x{top:0}',
    ]);
    // The page's custom script, its own script, then each component's, scoped to its placements.
    const scripts = out.custom_js.split('\n');
    expect(scripts[0]).toBe('custom();');
    expect(scripts[1]).toBe('page();');
    expect(out.custom_js).toContain('document.querySelectorAll("[data-cms-fragment=\\"site-header\\"]")');
    expect(out.custom_js).toContain('root.dataset.ready = "1";');
    expect(out.custom_js).toContain('document.querySelectorAll("[data-cms-fragment=\\"hero\\"]")');
    expect(out.custom_js.indexOf('site-header')).toBeLessThan(out.custom_js.indexOf('"hero'));
    expect(out.head_html).toBe('<link rel="preload">');
    expect(out.pagination).toBeNull();
  });

  it('hands the renderer the site’s stylesheets compiled from SCSS', async () => {
    const site = await siteWithChrome();
    await livePage(site._id, '/', content('<p>Home</p>'));
    const out = await cmsRenderService.render(HOST, '/');
    expect(out.site).toMatchObject({ custom_css: 'body{padding:4px}', custom_js: 'window.site = 1;', design: { base_css: 'html{color:#111}' } });
    expect(out.site?.key).toBe(site.key);
  });

  it('serves a stylesheet that stopped compiling as written rather than failing the page', async () => {
    const site = await makeSite({ domains: [HOST], custom_css: '.broken { color: ; }', design: { base_css: '$x' } });
    await livePage(site._id, '/', content('<p>Home</p>', { scss: '.p { color: $undefined; }' }), { custom_css: '.c {' });
    const out = await cmsRenderService.render(HOST, '/');
    expect(out.status).toBe(200);
    expect(out.site).toMatchObject({ custom_css: '.broken { color: ; }', design: { base_css: '$x' } });
    expect(out.css.split('\n')).toEqual(['.p { color: $undefined; }', '.c {']);
  });

  it('leaves out the header or footer the page hides', async () => {
    const site = await siteWithChrome();
    await livePage(site._id, '/landing', content('<p>Land</p>'), { show_header: false });
    await livePage(site._id, '/bare', content('<p>Bare</p>'), { show_footer: false, show_header: false });
    const landing = await cmsRenderService.render(HOST, '/landing');
    expect(landing.html.startsWith('<main')).toBe(true);
    expect(landing.html).toContain('data-cms-chrome="footer"');
    expect((await cmsRenderService.render(HOST, '/bare')).html).toBe('<main id="main" data-cms-page><p>Bare</p></main>');
  });

  it('shows only published components, never a draft', async () => {
    const site = await makeSite({ domains: [HOST] });
    const header = await makeFragment(site._id, { key: 'head', draft: { project: '', ...content('<nav>draft only</nav>') } });
    await site.updateOne({ header_fragment_id: header._id });
    await makeFragment(site._id, { key: 'promo', draft: { project: '', ...content('<b>Unpublished</b>') } });
    await liveFragment(site._id, 'cta', content('<a>Live</a>'));
    await livePage(site._id, '/', content('<cms-fragment data-key="promo"></cms-fragment><cms-fragment data-key="cta"></cms-fragment>'));
    const out = await cmsRenderService.render(HOST, '/');
    expect(out.html).toBe('<main id="main" data-cms-page><div data-cms-fragment="cta"><a>Live</a></div></main>');
    expect(out.custom_js).toBe('');
  });

  it('carries the page’s own SEO, falling back to the site’s for what it leaves blank', async () => {
    const site = await makeSite({ domains: [HOST], seo: { title: 'Duncit', description: 'Meet people', og_image_url: 'https://cdn.test/og.png' } });
    await livePage(site._id, '/plain', content('<p>x</p>'));
    await livePage(site._id, '/rich', content('<p>x</p>'), {
      seo: {
        title: 'Rich',
        og_title: 'Share me',
        og_description: 'Share text',
        twitter_card: 'summary',
        keywords: 'a, b',
        json_ld: '{"@type":"WebPage"}',
        meta_tags: [{ name: 'author', content: 'Duncit' }],
        canonical_url: 'https://duncit.com/rich',
      },
    });
    expect((await cmsRenderService.render(HOST, '/plain')).seo).toEqual({
      title: 'Duncit',
      description: 'Meet people',
      og_image_url: 'https://cdn.test/og.png',
      canonical_url: '',
      noindex: false,
      og_title: '',
      og_description: '',
      twitter_card: '',
      keywords: '',
      json_ld: '',
      meta_tags: [],
    });
    expect((await cmsRenderService.render(HOST, '/rich')).seo).toEqual({
      title: 'Rich',
      description: 'Meet people',
      og_image_url: 'https://cdn.test/og.png',
      canonical_url: 'https://duncit.com/rich',
      noindex: false,
      og_title: 'Share me',
      og_description: 'Share text',
      twitter_card: 'summary',
      keywords: 'a, b',
      json_ld: '{"@type":"WebPage"}',
      meta_tags: [{ name: 'author', content: 'Duncit' }],
    });
  });

  it('renders a page saved before SCSS and JS existed', async () => {
    const site = await makeSite({ domains: [HOST] });
    // Written straight to the collection: no scss/js keys at all, as an older document has.
    await CmsPageModel.collection.insertOne({
      site_id: site._id,
      kind: 'PAGE',
      title: 'Legacy',
      path: '/legacy',
      is_published: true,
      draft: { project: '', html: '<p>old draft</p>', css: '' },
      published: { html: '<p>old</p>', css: '.o { top: 0; }', version: 1 },
    });
    const out = await cmsRenderService.render(HOST, '/legacy');
    expect(out).toMatchObject({ status: 200, title: 'Legacy', css: '.o{top:0}', custom_js: '' });
    expect(out.html).toBe('<main id="main" data-cms-page><p>old</p></main>');
  });
});

describe('cmsRenderService.render: errors', () => {
  it('returns nothing for a host no active site answers on', async () => {
    await makeSite({ domains: [HOST], is_active: false });
    const out = await cmsRenderService.render(HOST, '/');
    expect(out).toMatchObject({ status: 404, site: null, html: '', css: '', custom_js: '', pagination: null });
    expect(out.seo.meta_tags).toEqual([]);
  });

  it('serves the designed 404 page, unindexed, for an address nothing lives at', async () => {
    const site = await makeSite({ domains: [HOST] });
    await livePage(site._id, '/404', content('<h1>Lost?</h1>'), { title: 'Not found' });
    const out = await cmsRenderService.render(HOST, '/nowhere');
    expect(out).toMatchObject({ status: 404, title: 'Not found', seo: { noindex: true } });
    expect(out.html).toContain('<h1>Lost?</h1>');
  });

  it('serves an empty 404 when the site designed none', async () => {
    await makeSite({ domains: [HOST] });
    const out = await cmsRenderService.render(HOST, '/nowhere');
    expect(out).toMatchObject({ status: 404, title: '', html: '<main id="main" data-cms-page></main>', seo: { noindex: true } });
  });

  it.each([404, 500, 503])('keeps the %i status, unindexed, when its error page is opened directly', async (code) => {
    const site = await makeSite({ domains: [HOST] });
    await livePage(site._id, `/${code}`, content(`<h1>${code}</h1>`));
    const out = await cmsRenderService.render(HOST, `/${code}`);
    expect(out).toMatchObject({ status: code, seo: { noindex: true } });
  });
});

describe('cmsRenderService.render: collections', () => {
  async function blog(over: Record<string, unknown> = {}) {
    return makeSite({ domains: [HOST], collections: ['BLOG'], ...over });
  }

  it('lists live entries with the designed list template and paginates', async () => {
    const site = await blog();
    await makePage(site._id, {
      kind: 'COLLECTION_LIST',
      collection_type: 'BLOG',
      path: '',
      title: 'Journal',
      is_published: true,
      published: { ...content('<section><cms-entry-list data-variant="rows"></cms-entry-list></section>', { scss: '.l { b: 1; }' }), version: 1 },
    });
    for (let i = 0; i < 13; i += 1) await makeEntry(site._id, { slug: `p-${i}`, title: `Post ${i}`, published_at: new Date(2026, 0, i + 1) });
    await makeEntry(site._id, { slug: 'scheduled', published_at: new Date(Date.now() + 86_400_000) });
    await makeEntry(site._id, { slug: 'hidden', is_published: false });

    const first = await cmsRenderService.render(HOST, '/blog');
    expect(first).toMatchObject({ status: 200, title: 'Journal', pagination: { page: 1, total_pages: 2, base_path: '/blog' } });
    expect(first.css).toBe('.l{b:1}');
    const last = await cmsRenderService.render(HOST, '/blog', 99);
    expect(last.pagination).toEqual({ page: 2, total_pages: 2, base_path: '/blog' });
    expect(last.html).not.toContain('scheduled');
    expect(last.html).not.toContain('hidden');
    expect((await cmsRenderService.render(HOST, '/blog', -3)).pagination?.page).toBe(1);
  });

  it('falls back to the built-in list when the site has no list template, titled after the site', async () => {
    const site = await blog({ name: 'Duncit Blog' });
    await makeEntry(site._id, { slug: 'first', title: 'First post' });
    const out = await cmsRenderService.render(HOST, '/blog');
    expect(out).toMatchObject({ status: 200, title: 'Duncit Blog', pagination: { page: 1, total_pages: 1 } });
    expect(out.html).toContain('First post');
  });

  it('falls back to the built-in list when the list template is published empty', async () => {
    const site = await blog();
    await makePage(site._id, { kind: 'COLLECTION_LIST', collection_type: 'BLOG', path: '', title: 'Empty', is_published: true });
    await makeEntry(site._id, { slug: 'first', title: 'First post' });
    expect((await cmsRenderService.render(HOST, '/blog')).html).toContain('First post');
  });

  it('serves one entry at its address, with its SEO over the site’s', async () => {
    const site = await blog({ seo: { title: 'Duncit', description: 'Site', og_image_url: 'https://cdn.test/site.png' } });
    await makePage(site._id, {
      kind: 'COLLECTION_DETAIL',
      collection_type: 'BLOG',
      path: '',
      title: 'Post template',
      is_published: true,
      published: { ...content('<article><h1><cms-field data-field="title"></cms-field></h1></article>'), version: 1 },
    });
    await makeEntry(site._id, { slug: 'hello', title: 'Hello world', summary: 'A first post', cover_image_url: 'https://cdn.test/hello.png' });
    await makeEntry(site._id, { slug: 'plain', title: 'Plain', seo: { title: 'Own title' } });
    const out = await cmsRenderService.render(HOST, '/blog/hello');
    expect(out).toMatchObject({ status: 200, title: 'Hello world', seo: { title: 'Hello world', description: 'A first post', og_image_url: 'https://cdn.test/hello.png' } });
    expect(out.html).toContain('Hello world');
    expect((await cmsRenderService.render(HOST, '/blog/plain')).seo).toMatchObject({ title: 'Own title', og_image_url: 'https://cdn.test/site.png' });
  });

  it('answers 404 for an entry that is not live, and for an address deeper than an entry', async () => {
    const site = await blog();
    await makeEntry(site._id, { slug: 'draft', is_published: false });
    expect((await cmsRenderService.render(HOST, '/blog/draft')).status).toBe(404);
    expect((await cmsRenderService.render(HOST, '/blog/a/b')).status).toBe(404);
    expect((await cmsRenderService.render(HOST, '/blogger')).status).toBe(404);
  });
});

describe('cmsRenderService.preview', () => {
  it('renders the draft with draft components, the draft SCSS and the draft script', async () => {
    const site = await makeSite({ domains: [HOST] });
    await makeFragment(site._id, { key: 'promo', draft: { project: '', ...content('<b>Draft promo</b>', { js: 'promo();' }) } });
    const page = await makePage(site._id, {
      title: 'Draft page',
      draft: { project: '', ...content('<cms-fragment data-key="promo"></cms-fragment>', { css: '.a { b: 1; }', scss: '.s { c: 2; }', js: 'draft();' }) },
      published: { ...content('<p>Live</p>', { js: 'live();' }), version: 1 },
      is_published: true,
    });
    const out = await cmsRenderService.preview(page.id);
    expect(out.html).toBe('<main id="main" data-cms-page><div data-cms-fragment="promo"><b>Draft promo</b></div></main>');
    expect(out.css).toBe('.a{b:1}.s{c:2}');
    expect(out.custom_js.startsWith('draft();\n')).toBe(true);
    expect(out.custom_js).toContain('promo();');
    expect(out.custom_js).not.toContain('live();');
  });

  it('shows the live copy when the draft is empty', async () => {
    const site = await makeSite({ domains: [HOST] });
    const page = await makePage(site._id, { published: { ...content('<p>Live</p>', { js: 'live();' }), version: 1 } });
    const out = await cmsRenderService.preview(page.id);
    expect(out.html).toBe('<main id="main" data-cms-page><p>Live</p></main>');
    expect(out.custom_js).toBe('live();');
  });

  it('renders one saved version, with its own SCSS and script, beside the live components', async () => {
    const site = await makeSite({ domains: [HOST] });
    await liveFragment(site._id, 'cta', content('<a>Live CTA</a>'), content('<a>Draft CTA</a>'));
    const page = await makePage(site._id, { draft: { project: '', ...content('<p>Now</p>') } });
    await makeVersion(page, 'PAGE', { version: 2, ...content('<cms-fragment data-key="cta"></cms-fragment>', { css: '.v { a: 1; }', scss: '.w { b: 2; }', js: 'v2();' }) });
    const out = await cmsRenderService.preview(page.id, null, 2);
    expect(out.html).toBe('<main id="main" data-cms-page><div data-cms-fragment="cta"><a>Live CTA</a></div></main>');
    expect(out.css).toBe('.v{a:1}.w{b:2}');
    expect(out.custom_js).toBe('v2();');
  });

  it('renders a version saved before SCSS and JS existed', async () => {
    const site = await makeSite({ domains: [HOST] });
    const page = await makePage(site._id);
    const version = await makeVersion(page, 'PAGE', { version: 1, html: '<p>v1</p>' });
    await version.collection.updateOne({ _id: version._id }, { $unset: { scss: '', js: '' } });
    const out = await cmsRenderService.preview(page.id, null, 1);
    expect(out).toMatchObject({ css: '', custom_js: '', html: '<main id="main" data-cms-page><p>v1</p></main>' });
  });

  it('refuses a version the page does not have, a missing page and a missing site', async () => {
    const site = await makeSite();
    const page = await makePage(site._id);
    await expect(cmsRenderService.preview(page.id, null, 9)).rejects.toMatchObject({ message: 'Version not found' });
    await expect(cmsRenderService.preview(missingId())).rejects.toMatchObject({ message: 'Page not found' });
    const orphan = await makePage(new Types.ObjectId());
    await expect(cmsRenderService.preview(orphan.id)).rejects.toMatchObject({ message: 'Site not found' });
  });

  it('previews a list template over the newest entries, published or not', async () => {
    const site = await makeSite({ domains: [HOST], collections: ['BLOG'] });
    const page = await makePage(site._id, { kind: 'COLLECTION_LIST', collection_type: 'BLOG', path: '' });
    await makeEntry(site._id, { slug: 'wip', title: 'Work in progress', is_published: false });
    const out = await cmsRenderService.preview(page.id);
    expect(out.html).toContain('Work in progress');
  });

  it('previews an entry template at the entry asked for, else the newest, else with none', async () => {
    const site = await makeSite({ domains: [HOST], collections: ['BLOG'] });
    const page = await makePage(site._id, {
      kind: 'COLLECTION_DETAIL',
      collection_type: 'BLOG',
      path: '',
      draft: { project: '', ...content('<h1><cms-field data-field="title"></cms-field></h1>') },
    });
    expect((await cmsRenderService.preview(page.id)).html).toBe('<main id="main" data-cms-page><h1><cms-field data-field="title"></cms-field></h1></main>');
    const old = await makeEntry(site._id, { slug: 'old', title: 'Old post', published_at: new Date('2025-01-01') });
    await makeEntry(site._id, { slug: 'new', title: 'New post', published_at: new Date('2026-01-01') });
    expect((await cmsRenderService.preview(page.id)).html).toContain('New post');
    expect((await cmsRenderService.preview(page.id, old.id)).html).toContain('Old post');
  });
});

describe('cmsRenderService.errorPage', () => {
  it('serves the site’s designed error page with its status, never indexed', async () => {
    const site = await makeSite({ domains: [HOST], seo: { title: 'Duncit', description: '', og_image_url: '' } });
    await livePage(site._id, '/503', content('<h1>Back soon</h1>', { js: 'retry();' }), { title: 'Maintenance' });
    const out = await cmsRenderService.errorPage(HOST, 503);
    expect(out).toMatchObject({ status: 503, title: 'Maintenance', custom_js: 'retry();', seo: { noindex: true, title: 'Duncit' } });
    expect(out?.html).toContain('Back soon');
  });

  it('returns null for a code that has no error page, an unknown host, or a site that designed none', async () => {
    const site = await makeSite({ domains: [HOST] });
    await livePage(site._id, '/418', content('<p>teapot</p>'));
    await makePage(site._id, { path: '/500', published: { ...content('<p>unpublished</p>'), version: 1 } });
    expect(await cmsRenderService.errorPage(HOST, 418)).toBeNull();
    expect(await cmsRenderService.errorPage('elsewhere.test', 404)).toBeNull();
    expect(await cmsRenderService.errorPage(HOST, 404)).toBeNull();
    expect(await cmsRenderService.errorPage(HOST, 500)).toBeNull();
  });
});

describe('cmsRenderService.previewComponent', () => {
  it('renders a component draft on its own: no header or footer, never indexed, in the site styles', async () => {
    const site = await makeSite({ domains: [HOST], seo: { title: 'Duncit', description: 'Site', og_image_url: '' }, custom_css: '.site { a: 1; }' });
    const head = await liveFragment(site._id, 'site-header', content('<nav>Nav</nav>'));
    await site.updateOne({ header_fragment_id: head._id, footer_fragment_id: head._id });
    const card = await makeFragment(site._id, {
      key: 'card',
      name: 'Card',
      is_published: true,
      published: { ...content('<p>Live card</p>', { js: 'live();' }), version: 1 },
      draft: { project: '', ...content('<div class="c">Draft card</div>', { css: '.c { a: 1; }', scss: '.c { b: 2; }', js: 'root.x = 1;' }) },
    });

    const out = await cmsRenderService.previewComponent(card.id);
    expect(out.html).toBe('<main id="main" data-cms-page><div data-cms-fragment="card"><div class="c">Draft card</div></div></main>');
    expect(out.css).toBe('[data-cms-fragment=card] .c{a:1}[data-cms-fragment=card] .c{b:2}');
    expect(out.custom_js).toContain('document.querySelectorAll("[data-cms-fragment=\\"card\\"]")');
    expect(out.custom_js).toContain('root.x = 1;');
    expect(out.custom_js).not.toContain('live();');
    expect(out).toMatchObject({ status: 200, title: 'Card', head_html: '', pagination: null, seo: { noindex: true, title: 'Duncit', description: 'Site' } });
    expect(out.site?.custom_css).toBe('.site{a:1}');
  });

  it('renders one saved version of a component instead of its draft', async () => {
    const site = await makeSite({ domains: [HOST] });
    const card = await makeFragment(site._id, { key: 'card', draft: { project: '', ...content('<p>Now</p>', { js: 'now();' }) } });
    await makeVersion(card, 'FRAGMENT', { version: 4, ...content('<p>Version 4</p>', { css: '.u { a: 0; }', scss: '.v { a: 1; }', js: 'v4();' }) });
    const out = await cmsRenderService.previewComponent(card.id, 4);
    expect(out.html).toBe('<main id="main" data-cms-page><div data-cms-fragment="card"><p>Version 4</p></div></main>');
    expect(out.css).toBe('[data-cms-fragment=card] .u{a:0}[data-cms-fragment=card] .v{a:1}');
    expect(out.custom_js).toContain('v4();');
    expect(out.custom_js).not.toContain('now();');
  });

  it('renders a component version saved before SCSS and JS existed', async () => {
    const site = await makeSite({ domains: [HOST] });
    const card = await makeFragment(site._id, { key: 'card' });
    const version = await makeVersion(card, 'FRAGMENT', { version: 1, html: '<p>v1</p>' });
    await version.collection.updateOne({ _id: version._id }, { $unset: { scss: '', js: '' } });
    const out = await cmsRenderService.previewComponent(card.id, 1);
    expect(out).toMatchObject({ css: '', custom_js: '' });
  });

  it('refuses a version it does not have, a missing component, a missing site and a malformed id', async () => {
    const site = await makeSite();
    const card = await makeFragment(site._id);
    await expect(cmsRenderService.previewComponent(card.id, 3)).rejects.toMatchObject({ message: 'Version not found' });
    await expect(cmsRenderService.previewComponent(missingId())).rejects.toMatchObject({ message: 'Component not found' });
    const orphan = await makeFragment(new Types.ObjectId());
    await expect(cmsRenderService.previewComponent(orphan.id)).rejects.toMatchObject({ message: 'Site not found' });
    await expect(cmsRenderService.previewComponent('nope')).rejects.toMatchObject({ message: 'Invalid component id' });
  });
});

describe('cmsRenderService.sitemap', () => {
  it('lists live, indexable pages, the collections and their live entries, never an error page', async () => {
    const site = await makeSite({ domains: [HOST], collections: ['BLOG', 'CAREER'], collection_paths: [{ collection: 'CAREER', path: '/jobs' }] });
    await livePage(site._id, '/', content('<p>Home</p>'));
    await livePage(site._id, '/about', content('<p>About</p>'));
    await livePage(site._id, '/private', content('<p>x</p>'), { seo: { noindex: true } });
    await makePage(site._id, { path: '/draft' });
    for (const code of [404, 500, 503]) await livePage(site._id, `/${code}`, content(`<p>${code}</p>`));
    await makeEntry(site._id, { slug: 'hello' });
    await makeEntry(site._id, { collection_type: 'CAREER', slug: 'qa' });
    await makeEntry(site._id, { slug: 'unlisted', seo: { noindex: true } });
    await makeEntry(site._id, { slug: 'later', published_at: new Date(Date.now() + 86_400_000) });
    await makeEntry(site._id, { collection_type: 'NEWSROOM', slug: 'off' });

    const urls = await cmsRenderService.sitemap(HOST);
    expect(urls.map((u) => u.path).sort((a, b) => a.localeCompare(b))).toEqual(['/', '/about', '/blog', '/blog/hello', '/jobs', '/jobs/qa']);
    expect(urls.every((u) => !Number.isNaN(Date.parse(u.updated_at)))).toBe(true);
  });

  it('is empty for a host no site answers on', async () => {
    expect(await cmsRenderService.sitemap('nobody.test')).toEqual([]);
  });
});

describe('cmsRenderService.preview: templates', () => {
  it('uses a list template’s own draft when it has one', async () => {
    const site = await makeSite({ domains: [HOST], collections: ['BLOG'] });
    const page = await makePage(site._id, {
      kind: 'COLLECTION_LIST',
      collection_type: 'BLOG',
      path: '',
      draft: { project: '', ...content('<h2>Latest</h2><cms-entry-list data-variant="compact"></cms-entry-list>') },
    });
    await makeEntry(site._id, { slug: 'one', title: 'One' });
    const out = await cmsRenderService.preview(page.id);
    expect(out.html).toContain('<h2>Latest</h2>');
    expect(out.html).toContain('cms-list--compact');
    expect(out.html).toContain('One');
  });

  it('falls back to the built-in entry template when the detail template is still empty', async () => {
    const site = await makeSite({ domains: [HOST], collections: ['BLOG'] });
    const page = await makePage(site._id, { kind: 'COLLECTION_DETAIL', collection_type: 'BLOG', path: '' });
    await makeEntry(site._id, { slug: 'one', title: 'Only post', category: 'News' });
    const out = await cmsRenderService.preview(page.id);
    expect(out.html).toContain('class="cms-entry"');
    expect(out.html).toContain('Only post');
  });

  it('previews a template that lost its collection as a plain page', async () => {
    const site = await makeSite({ domains: [HOST], collections: ['BLOG'] });
    await makeEntry(site._id, { slug: 'one', title: 'Not listed' });
    const page = await makePage(site._id, { kind: 'COLLECTION_LIST', collection_type: null, path: '', draft: { project: '', ...content('<p>Orphan</p>') } });
    const out = await cmsRenderService.preview(page.id);
    expect(out.html).toBe('<main id="main" data-cms-page><p>Orphan</p></main>');
  });
});
