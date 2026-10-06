import { Types } from 'mongoose';
import { signedLink } from '@utils/signed-link';
import { cmsPreviewLinkService, COMPONENT_PREVIEW_PATH, decodeTarget, PREVIEW_PARAM } from '../../cmsPreviewLink.service';
import { cmsRenderService } from '../../cmsRender.service';
import { CmsSiteModel } from '../../cmsSite.model';
import { CmsPageModel } from '../../cmsPage.model';
import { CmsFragmentModel } from '../../cmsFragment.model';
import { content, makeEntry, makeFragment, makePage, makeSite, makeVersion } from './cms.fixtures';

const tokenOf = (url: string) => new URL(url).searchParams.get(PREVIEW_PARAM) ?? '';
/** What a link's token names, read back the way the renderer verifies it. */
const targetOf = (url: string) => decodeTarget(signedLink('cms-preview', 60_000).verify(tokenOf(url)) ?? '');
const missingId = () => new Types.ObjectId().toHexString();

describe('cmsPreviewLinkService.link: pages', () => {
  it('links a page draft at its real address on the site’s first domain', async () => {
    const site = await makeSite({ domains: ['duncit.test', 'www.duncit.test'] });
    const page = await makePage(site._id, { path: '/about' });
    const before = Date.now();
    const link = await cmsPreviewLinkService.link('PAGE', page.id);
    expect(link.url).toMatch(/^https:\/\/duncit\.test\/about\?cms_preview=[\w-]+\.[\w-]+$/);
    expect(targetOf(link.url)).toEqual({ kind: 'PAGE', id: page.id, version: null, entryId: null });
    const expires = Date.parse(link.expires_at) - before;
    expect(expires).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000);
    expect(expires).toBeLessThan(2 * 60 * 60 * 1000 + 5_000);
  });

  it('links one saved version of a page', async () => {
    const site = await makeSite();
    const page = await makePage(site._id, { path: '/about' });
    await makeVersion(page, 'PAGE', { version: 3 });
    const link = await cmsPreviewLinkService.link('PAGE', page.id, 3);
    expect(targetOf(link.url)).toMatchObject({ kind: 'PAGE', version: 3 });
  });

  it('refuses a version the page does not have', async () => {
    const site = await makeSite();
    const page = await makePage(site._id);
    await makeVersion(page, 'FRAGMENT', { version: 3 });
    await expect(cmsPreviewLinkService.link('PAGE', page.id, 3)).rejects.toMatchObject({ message: 'Version not found' });
  });

  it('links a collection list template at the collection’s address', async () => {
    const site = await makeSite({ collection_paths: [{ collection: 'BLOG', path: '/journal' }] });
    const page = await makePage(site._id, { kind: 'COLLECTION_LIST', collection_type: 'BLOG', path: '' });
    expect(new URL((await cmsPreviewLinkService.link('PAGE', page.id)).url).pathname).toBe('/journal');
  });

  it('links an entry template at its newest entry, or at the one asked for', async () => {
    const site = await makeSite();
    const page = await makePage(site._id, { kind: 'COLLECTION_DETAIL', collection_type: 'BLOG', path: '' });
    const older = await makeEntry(site._id, { slug: 'older', published_at: new Date('2026-01-01') });
    const newer = await makeEntry(site._id, { slug: 'newer', published_at: new Date('2026-03-01') });

    const newest = await cmsPreviewLinkService.link('PAGE', page.id);
    expect(new URL(newest.url).pathname).toBe('/blog/newer');
    expect(targetOf(newest.url)?.entryId).toBe(newer.id);

    const chosen = await cmsPreviewLinkService.link('PAGE', page.id, null, older.id);
    expect(new URL(chosen.url).pathname).toBe('/blog/older');
    expect(targetOf(chosen.url)?.entryId).toBe(older.id);
  });

  it('asks for an entry before an entry template can be previewed', async () => {
    const site = await makeSite();
    const page = await makePage(site._id, { kind: 'COLLECTION_DETAIL', collection_type: 'CAREER', path: '' });
    await makeEntry(site._id, { collection_type: 'BLOG' });
    await expect(cmsPreviewLinkService.link('PAGE', page.id)).rejects.toMatchObject({
      message: 'Add an entry to this collection to preview its page',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('asks for a domain before anything on the site can be previewed', async () => {
    const site = await makeSite({ name: 'Partners', domains: [] });
    const page = await makePage(site._id);
    await expect(cmsPreviewLinkService.link('PAGE', page.id)).rejects.toMatchObject({
      message: 'Add a domain to Partners in its Settings to preview it on the site',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('reports a missing page, a missing site and a malformed id', async () => {
    await expect(cmsPreviewLinkService.link('PAGE', missingId())).rejects.toMatchObject({ message: 'Page not found' });
    const orphan = await makePage(new Types.ObjectId());
    await expect(cmsPreviewLinkService.link('PAGE', orphan.id)).rejects.toMatchObject({ message: 'Site not found' });
    await expect(cmsPreviewLinkService.link('PAGE', 'nope')).rejects.toMatchObject({ message: 'Invalid page id' });
  });
});

describe('cmsPreviewLinkService.link: components', () => {
  it('links a component at its own preview address', async () => {
    const site = await makeSite({ domains: ['duncit.test'] });
    const fragment = await makeFragment(site._id, { key: 'hero' });
    const link = await cmsPreviewLinkService.link('FRAGMENT', fragment.id);
    expect(link.url.startsWith(`https://duncit.test${COMPONENT_PREVIEW_PATH}/hero?${PREVIEW_PARAM}=`)).toBe(true);
    expect(targetOf(link.url)).toEqual({ kind: 'FRAGMENT', id: fragment.id, version: null, entryId: null });
  });

  it('links one saved version of a component, and refuses one it does not have', async () => {
    const site = await makeSite();
    const fragment = await makeFragment(site._id);
    await makeVersion(fragment, 'FRAGMENT', { version: 2 });
    expect(targetOf((await cmsPreviewLinkService.link('FRAGMENT', fragment.id, 2)).url)).toMatchObject({ kind: 'FRAGMENT', version: 2 });
    await expect(cmsPreviewLinkService.link('FRAGMENT', fragment.id, 5)).rejects.toMatchObject({ message: 'Version not found' });
  });

  it('reports a missing component, its missing site, a site without a domain and a malformed id', async () => {
    await expect(cmsPreviewLinkService.link('FRAGMENT', missingId())).rejects.toMatchObject({ message: 'Component not found' });
    const orphan = await makeFragment(new Types.ObjectId());
    await expect(cmsPreviewLinkService.link('FRAGMENT', orphan.id)).rejects.toMatchObject({ message: 'Site not found' });
    const bare = await makeFragment((await makeSite({ domains: [] }))._id);
    await expect(cmsPreviewLinkService.link('FRAGMENT', bare.id)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(cmsPreviewLinkService.link('FRAGMENT', 'nope')).rejects.toMatchObject({ message: 'Invalid component id' });
  });
});

describe('cmsPreviewLinkService.withPreviewUrls', () => {
  const versions = [
    { id: 'a', version: 2 },
    { id: 'b', version: 1 },
  ];

  it('gives each page version its own link', async () => {
    const site = await makeSite();
    const page = await makePage(site._id, { path: '/about' });
    const out = await cmsPreviewLinkService.withPreviewUrls('PAGE', page.id, versions);
    expect(out.map((v) => v.id)).toEqual(['a', 'b']);
    expect(out.map((v) => targetOf(v.preview_url ?? '')?.version)).toEqual([2, 1]);
  });

  it('gives each component version its own link at the component address', async () => {
    const site = await makeSite();
    const fragment = await makeFragment(site._id, { key: 'footer' });
    const out = await cmsPreviewLinkService.withPreviewUrls('FRAGMENT', fragment.id, versions);
    expect(new URL(out[0].preview_url ?? '').pathname).toBe(`${COMPONENT_PREVIEW_PATH}/footer`);
    expect(targetOf(out[1].preview_url ?? '')).toMatchObject({ kind: 'FRAGMENT', version: 1 });
  });

  it('still lists versions, without links, for a site that has no domain', async () => {
    const site = await makeSite({ domains: [] });
    const fragment = await makeFragment(site._id);
    expect(await cmsPreviewLinkService.withPreviewUrls('FRAGMENT', fragment.id, versions)).toEqual([
      { id: 'a', version: 2, preview_url: null },
      { id: 'b', version: 1, preview_url: null },
    ]);
  });

  it('does not hide a missing page behind an empty link', async () => {
    await expect(cmsPreviewLinkService.withPreviewUrls('PAGE', missingId(), versions)).rejects.toMatchObject({ message: 'Page not found' });
  });
});

describe('cmsPreviewLinkService.render', () => {
  it('renders a page draft from its link', async () => {
    const site = await makeSite();
    const page = await makePage(site._id, { path: '/about', title: 'About', draft: { project: '', ...content('<h1>Draft</h1>') } });
    const out = await cmsPreviewLinkService.render(tokenOf((await cmsPreviewLinkService.link('PAGE', page.id)).url));
    expect(out).toMatchObject({ status: 200, title: 'About' });
    expect(out?.html).toContain('<h1>Draft</h1>');
  });

  it('renders a component draft on its own from its link', async () => {
    const site = await makeSite();
    const fragment = await makeFragment(site._id, { key: 'cta', name: 'Call to action', draft: { project: '', ...content('<a>Join</a>') } });
    const out = await cmsPreviewLinkService.render(tokenOf((await cmsPreviewLinkService.link('FRAGMENT', fragment.id)).url));
    expect(out).toMatchObject({ title: 'Call to action', seo: { noindex: true } });
    expect(out?.html).toBe('<main id="main" data-cms-page><div data-cms-fragment="cta"><a>Join</a></div></main>');
  });

  it.each([
    ['a forged token', 'forged.token'],
    ['an empty token', ''],
  ])('renders nothing for %s', async (_label, token) => {
    await expect(cmsPreviewLinkService.render(token)).resolves.toBeNull();
  });

  it('renders nothing for a correctly signed token that names no preview target', async () => {
    await expect(cmsPreviewLinkService.render(signedLink('cms-preview', 60_000).sign('not-a-target'))).resolves.toBeNull();
  });

  it('renders nothing for a token signed for another route', async () => {
    const site = await makeSite();
    const page = await makePage(site._id);
    await expect(cmsPreviewLinkService.render(signedLink('db-backup', 60_000).sign(`P:${page.id}:draft:`))).resolves.toBeNull();
  });

  it('renders nothing once the page or component behind a link is deleted', async () => {
    const site = await makeSite();
    const page = await makePage(site._id);
    const fragment = await makeFragment(site._id);
    const pageToken = tokenOf((await cmsPreviewLinkService.link('PAGE', page.id)).url);
    const fragmentToken = tokenOf((await cmsPreviewLinkService.link('FRAGMENT', fragment.id)).url);
    await CmsPageModel.deleteMany({});
    await CmsFragmentModel.deleteMany({});
    await expect(cmsPreviewLinkService.render(pageToken)).resolves.toBeNull();
    await expect(cmsPreviewLinkService.render(fragmentToken)).resolves.toBeNull();
  });

  it('renders nothing once the site is deleted', async () => {
    const site = await makeSite();
    const page = await makePage(site._id);
    const token = tokenOf((await cmsPreviewLinkService.link('PAGE', page.id)).url);
    await CmsSiteModel.deleteMany({});
    await expect(cmsPreviewLinkService.render(token)).resolves.toBeNull();
  });

  it('lets a real failure through instead of hiding it as “nothing to show”', async () => {
    const site = await makeSite();
    const page = await makePage(site._id);
    const token = tokenOf((await cmsPreviewLinkService.link('PAGE', page.id)).url);
    jest.spyOn(cmsRenderService, 'preview').mockRejectedValueOnce(new Error('database unavailable'));
    await expect(cmsPreviewLinkService.render(token)).rejects.toThrow('database unavailable');
  });
});
