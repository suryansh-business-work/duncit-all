import { Types } from 'mongoose';
import { cmsPageService, type CmsPageInput } from '../../cmsPage.service';
import { CmsPageModel } from '../../cmsPage.model';
import { CmsVersionModel } from '../../cmsVersion.model';
import { makePage, makeSite, makeVersion } from './cms.fixtures';

const USER = 'editor-1';

const input = (over: Partial<CmsPageInput> = {}): CmsPageInput => ({
  kind: 'PAGE',
  collection_type: null,
  title: 'About',
  path: '/about',
  seo: { title: 'About Duncit', json_ld: '{"@type":"AboutPage"}', meta_tags: [{ name: 'author', content: 'Duncit' }] },
  show_header: true,
  show_footer: true,
  head_html: '',
  custom_css: '$brand: #f60;\n.hero { color: $brand; }',
  custom_js: 'document.title = "About";',
  sort_order: 0,
  ...over,
});

beforeAll(() => CmsPageModel.init());

describe('cmsPageService.create', () => {
  it('creates a page whose SCSS and script compile, with its sharing SEO', async () => {
    const site = await makeSite();
    const page = await cmsPageService.create(site.id, input(), USER);
    expect(page).toMatchObject({ title: 'About', path: '/about', custom_css: input().custom_css, custom_js: input().custom_js, updated_by: USER });
    expect(page?.seo).toMatchObject({ json_ld: '{"@type":"AboutPage"}', meta_tags: [{ name: 'author', content: 'Duncit' }] });
  });

  it('refuses page CSS that does not compile, naming the line, and creates nothing', async () => {
    const site = await makeSite();
    await expect(cmsPageService.create(site.id, input({ custom_css: '.a {\n  color: $nope;\n}' }), USER)).rejects.toMatchObject({
      message: expect.stringMatching(/^Page CSS — line 2, column \d+: Undefined variable\./),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await CmsPageModel.countDocuments()).toBe(0);
  });

  it('refuses page JavaScript that does not parse, and creates nothing', async () => {
    const site = await makeSite();
    await expect(cmsPageService.create(site.id, input({ custom_js: 'if (' }), USER)).rejects.toMatchObject({
      message: expect.stringMatching(/^Page JavaScript — line 1, column \d+: /),
    });
    expect(await CmsPageModel.countDocuments()).toBe(0);
  });

  it('checks the code before the site, so bad code is reported even for a missing site', async () => {
    await expect(cmsPageService.create(new Types.ObjectId().toHexString(), input({ custom_js: 'if (' }), USER)).rejects.toThrow(
      /^Page JavaScript/
    );
    await expect(cmsPageService.create(new Types.ObjectId().toHexString(), input(), USER)).rejects.toMatchObject({ message: 'Site not found' });
  });

  it('asks a PAGE for a path and a template for its collection', async () => {
    const site = await makeSite();
    await expect(cmsPageService.create(site.id, input({ path: '' }), USER)).rejects.toMatchObject({ message: 'Give the page a path, like /about' });
    await expect(cmsPageService.create(site.id, input({ kind: 'COLLECTION_LIST' }), USER)).rejects.toMatchObject({
      message: 'Pick the collection this template is for',
    });
  });

  it('gives a template no path, and a PAGE no collection', async () => {
    const site = await makeSite();
    const template = await cmsPageService.create(site.id, input({ kind: 'COLLECTION_LIST', collection_type: 'BLOG' }), USER);
    expect(template).toMatchObject({ kind: 'COLLECTION_LIST', collection_type: 'BLOG', path: '' });
    const page = await cmsPageService.create(site.id, input({ path: '/x', collection_type: 'BLOG' }), USER);
    expect(page?.collection_type).toBeNull();
  });

  it('refuses a second page at the same path', async () => {
    const site = await makeSite();
    await cmsPageService.create(site.id, input(), USER);
    await expect(cmsPageService.create(site.id, input(), USER)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });
});

describe('cmsPageService.update', () => {
  it('saves a page whose code compiles', async () => {
    const site = await makeSite();
    const existing = await makePage(site._id, { path: '/about' });
    const page = await cmsPageService.update(existing.id, input({ title: 'About us', custom_js: '' }), 'editor-2');
    expect(page).toMatchObject({ title: 'About us', custom_js: '', updated_by: 'editor-2' });
  });

  it('refuses code that does not compile and leaves the page as it was', async () => {
    const site = await makeSite();
    const existing = await makePage(site._id, { path: '/about', custom_css: '.ok{}' });
    await expect(cmsPageService.update(existing.id, input({ custom_css: '.a { color: ; }' }), USER)).rejects.toThrow(/^Page CSS — line 1/);
    expect((await CmsPageModel.findById(existing._id).lean())?.custom_css).toBe('.ok{}');
  });

  it('reports a page that does not exist as not found', async () => {
    await expect(cmsPageService.update(new Types.ObjectId().toHexString(), input(), USER)).rejects.toMatchObject({ message: 'Page not found' });
  });

  it('refuses moving a page onto another page’s path', async () => {
    const site = await makeSite();
    await makePage(site._id, { path: '/about' });
    const other = await makePage(site._id, { path: '/team' });
    await expect(cmsPageService.update(other.id, input(), USER)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
  });
});

describe('cmsPageService: reading, copying and deleting', () => {
  it('reads a page, and null for one that does not exist', async () => {
    const site = await makeSite();
    const page = await makePage(site._id, { title: 'Home', path: '/' });
    expect((await cmsPageService.get(page.id))?.title).toBe('Home');
    expect(await cmsPageService.get(new Types.ObjectId().toHexString())).toBeNull();
  });

  it('lists a site’s pages for the table without the editor project', async () => {
    const site = await makeSite();
    await makePage(site._id, { title: 'B', path: '/b', draft: { project: '{"big":true}', html: '<p>b</p>' } });
    await makePage(site._id, { title: 'A', path: '/a' });
    await makePage((await makeSite())._id, { title: 'Elsewhere' });
    const table = await cmsPageService.table(site.id, { search: 'b' });
    expect(table.total).toBe(1);
    expect(table.rows[0]).toMatchObject({ title: 'B', draft: { project: '', html: '<p>b</p>' } });
    expect((await cmsPageService.table(site.id)).rows.map((r) => r.path)).toEqual(['/a', '/b']);
  });

  it('duplicates a page’s design and code to a new, unpublished address', async () => {
    const site = await makeSite();
    const source = await makePage(site._id, {
      path: '/a',
      is_published: true,
      custom_css: '.x{}',
      draft: { project: '{}', html: '<p>copy me</p>', css: '', scss: '.s{}', js: 'go();' },
    });
    const copy = await cmsPageService.duplicate(source.id, 'Copy', '/b', USER);
    expect(copy).toMatchObject({ title: 'Copy', path: '/b', is_published: false, custom_css: '.x{}', draft: { html: '<p>copy me</p>', scss: '.s{}', js: 'go();' } });
    await expect(cmsPageService.duplicate(source.id, 'Again', '/a', USER)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
    await expect(cmsPageService.duplicate(new Types.ObjectId().toHexString(), 'X', '/x', USER)).rejects.toMatchObject({ message: 'Page not found' });
  });

  it('deletes a page with its history, and reports nothing deleted for a missing one', async () => {
    const site = await makeSite();
    const page = await makePage(site._id);
    await makeVersion(page, 'PAGE');
    await expect(cmsPageService.remove(page.id)).resolves.toBe(true);
    expect(await CmsVersionModel.countDocuments()).toBe(0);
    await expect(cmsPageService.remove(page.id)).resolves.toBe(false);
  });
});

describe('cmsPageService: unexpected database errors', () => {
  it('passes a non-duplicate failure through unchanged', async () => {
    const site = await makeSite();
    jest.spyOn(CmsPageModel, 'create').mockRejectedValueOnce(new Error('connection reset') as never);
    await expect(cmsPageService.create(site.id, input(), USER)).rejects.toThrow('connection reset');
  });
});
