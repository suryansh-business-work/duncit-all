import { cmsRenderService } from '../../cmsRender.service';
import { content, makeFragment, makePage, makeSite } from './cms.fixtures';

const HOST = 'nested.duncit.test';
const tag = (key: string) => `<cms-fragment data-key="${key}"></cms-fragment>`;
const wrap = (key: string, inner: string) => `<div data-cms-fragment="${key}">${inner}</div>`;

/** A live component whose markup is `html`, with a different draft. */
const live = (siteId: unknown, key: string, html: string, draft = `<p>${key} draft</p>`) =>
  makeFragment(siteId, { key, name: key, is_published: true, published: { ...content(html), version: 1 }, draft: { project: '', ...content(draft) } });

describe('components placed inside components', () => {
  it('renders nested components on a live page, three levels deep and no deeper', async () => {
    const site = await makeSite({ domains: [HOST] });
    await live(site._id, 'outer', `<section>${tag('middle')}</section>`);
    await live(site._id, 'middle', `<div>${tag('inner')}</div>`);
    await live(site._id, 'inner', `<b>Inner</b>${tag('too-deep')}`);
    await live(site._id, 'too-deep', '<i>never</i>');
    await makePage(site._id, { path: '/', is_published: true, published: { ...content(tag('outer')), version: 1 } });

    const out = await cmsRenderService.render(HOST, '/');
    expect(out.html).toBe(
      `<main id="main" data-cms-page>${wrap('outer', `<section>${wrap('middle', `<div>${wrap('inner', '<b>Inner</b>')}</div>`)}</section>`)}</main>`
    );
  });

  it('renders a nested component inside the site header', async () => {
    const site = await makeSite({ domains: [HOST] });
    const header = await live(site._id, 'site-header', `<nav>${tag('logo')}</nav>`);
    await live(site._id, 'logo', '<img alt="Duncit">');
    await site.updateOne({ header_fragment_id: header._id });
    await makePage(site._id, { path: '/', is_published: true, published: { ...content('<p>Home</p>'), version: 1 } });

    const out = await cmsRenderService.render(HOST, '/');
    expect(out.html).toContain(`<header data-cms-chrome="header">${wrap('site-header', `<nav>${wrap('logo', '<img alt="Duncit">')}</nav>`)}</header>`);
  });

  it('leaves out a nested component that is not live, or no longer exists', async () => {
    const site = await makeSite({ domains: [HOST] });
    await live(site._id, 'card', `<div>${tag('draft-only')}${tag('deleted')}</div>`);
    await makeFragment(site._id, { key: 'draft-only', is_published: false, draft: { project: '', ...content('<p>secret</p>') } });
    await makePage(site._id, { path: '/', is_published: true, published: { ...content(tag('card')), version: 1 } });

    const out = await cmsRenderService.render(HOST, '/');
    expect(out.html).toBe(`<main id="main" data-cms-page>${wrap('card', '<div></div>')}</main>`);
  });

  it('previews a component with the drafts of the components inside it', async () => {
    const site = await makeSite({ domains: [HOST] });
    const card = await live(site._id, 'card', '<p>live card</p>', `<div>${tag('badge')}</div>`);
    await live(site._id, 'badge', '<span>live badge</span>', '<span>draft badge</span>');

    const out = await cmsRenderService.previewComponent(card.id);
    expect(out.html).toBe(`<main id="main" data-cms-page>${wrap('card', `<div>${wrap('badge', '<span>draft badge</span>')}</div>`)}</main>`);
  });
});

describe("a site's sharing SEO as every page's default", () => {
  it('fills a page’s blank share card, keywords and structured data, with the site’s meta tags first', async () => {
    const site = await makeSite({
      domains: [HOST],
      seo: {
        title: 'Duncit',
        description: 'Meet people',
        og_image_url: '',
        og_title: 'Duncit — meet people',
        og_description: 'Pods near you',
        twitter_card: 'summary_large_image',
        keywords: 'pods, meetups',
        json_ld: '{"@type":"Organization"}',
        meta_tags: [{ name: 'theme-color', content: '#f82c2e' }],
      },
    });
    await makePage(site._id, { path: '/plain', is_published: true, published: { ...content('<p>x</p>'), version: 1 } });
    await makePage(site._id, {
      path: '/own',
      is_published: true,
      published: { ...content('<p>x</p>'), version: 1 },
      seo: { og_title: 'Own card', json_ld: '{"@type":"WebPage"}', meta_tags: [{ name: 'author', content: 'Duncit' }] },
    });

    expect((await cmsRenderService.render(HOST, '/plain')).seo).toMatchObject({
      og_title: 'Duncit — meet people',
      og_description: 'Pods near you',
      twitter_card: 'summary_large_image',
      keywords: 'pods, meetups',
      json_ld: '{"@type":"Organization"}',
      meta_tags: [{ name: 'theme-color', content: '#f82c2e' }],
    });
    expect((await cmsRenderService.render(HOST, '/own')).seo).toMatchObject({
      og_title: 'Own card',
      og_description: 'Pods near you',
      json_ld: '{"@type":"WebPage"}',
      meta_tags: [
        { name: 'theme-color', content: '#f82c2e' },
        { name: 'author', content: 'Duncit' },
      ],
    });
  });
});
