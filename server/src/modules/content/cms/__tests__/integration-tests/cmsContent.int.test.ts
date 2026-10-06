import { Types, type Model } from 'mongoose';
import { cmsContentService } from '../../cmsContent.service';
import { CmsPageModel, type ICmsPage } from '../../cmsPage.model';
import { CmsFragmentModel } from '../../cmsFragment.model';
import { CmsVersionModel } from '../../cmsVersion.model';
import { content, makeFragment, makePage, makeSite } from './cms.fixtures';

const USER = 'editor-1';
const draft = (over: Record<string, unknown> = {}) => ({ project: '{"pages":[]}', html: '<p>Hello</p>', css: '.a { color: red; }', ...over });

async function pageWithCode() {
  const site = await makeSite();
  return makePage(site._id, { draft: { project: '{}', ...content('<p>Old</p>', { css: '.old{}', scss: '$c: blue; .s { color: $c; }', js: 'root.x = 1;' }) } });
}

describe('cmsContentService.saveDraft', () => {
  it('keeps the saved SCSS and JS when the visual editor saves without them', async () => {
    const page = await pageWithCode();
    const saved = await cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft(), USER);
    expect(saved.draft).toMatchObject({ project: '{"pages":[]}', html: '<p>Hello</p>', css: '.a { color: red; }' });
    expect(saved.draft.scss).toBe('$c: blue; .s { color: $c; }');
    expect(saved.draft.js).toBe('root.x = 1;');
    expect(saved.updated_by).toBe(USER);
  });

  it('replaces SCSS and JS when the Code view sends them, clearing included', async () => {
    const page = await pageWithCode();
    const saved = await cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft({ scss: '.n { b: 1px; }', js: '' }), USER);
    expect(saved.draft.scss).toBe('.n { b: 1px; }');
    expect(saved.draft.js).toBe('');
  });

  it('saves a component the same way', async () => {
    const site = await makeSite();
    const fragment = await makeFragment(site._id);
    const saved = await cmsContentService.saveDraft(CmsFragmentModel, 'FRAGMENT', fragment.id, draft({ js: 'root.hidden = false;' }), USER);
    expect(saved.draft).toMatchObject({ html: '<p>Hello</p>', js: 'root.hidden = false;', scss: '' });
  });

  it.each([
    ['css', { css: '.a { color: ; }' }, /^The CSS — line 1, column \d+: /],
    ['scss', { scss: '.a {\n  color: $missing;\n}' }, /^The SCSS — line 2, column \d+: Undefined variable\./],
    ['js', { js: 'const = 1;' }, /^The JavaScript — line 1, column \d+: /],
  ])('refuses a draft whose %s does not compile, and leaves the saved draft alone', async (_part, bad, message) => {
    const page = await pageWithCode();
    await expect(cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft(bad), USER)).rejects.toMatchObject({
      message: expect.stringMatching(message),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    const unchanged = await CmsPageModel.findById(page._id).lean();
    expect(unchanged?.draft.html).toBe('<p>Old</p>');
  });

  it('refuses a save made over someone else’s newer save', async () => {
    const page = await pageWithCode();
    const stale = new Date(page.updated_at.getTime() - 60_000).toISOString();
    await expect(cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft({ base_updated_at: stale }), USER)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
  });

  it('saves when the base it was opened on is still current', async () => {
    const page = await pageWithCode();
    const saved = await cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft({ base_updated_at: page.updated_at.toISOString() }), USER);
    expect(saved.draft.html).toBe('<p>Hello</p>');
  });

  it('reports a page that does not exist as not found', async () => {
    await expect(cmsContentService.saveDraft(CmsPageModel, 'PAGE', new Types.ObjectId().toHexString(), draft(), USER)).rejects.toMatchObject({
      message: 'Page not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });
});

describe('cmsContentService.publish', () => {
  it('snapshots and publishes the SCSS and JS with the html and css', async () => {
    const page = await pageWithCode();
    const live = await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    expect(live.is_published).toBe(true);
    expect(live.published).toMatchObject({ html: '<p>Old</p>', css: '.old{}', scss: '$c: blue; .s { color: $c; }', js: 'root.x = 1;', version: 1 });
    const version = await CmsVersionModel.findOne({ owner_id: page._id }).lean();
    expect(version).toMatchObject({ version: 1, html: '<p>Old</p>', scss: '$c: blue; .s { color: $c; }', js: 'root.x = 1;', published_by: USER });
  });

  it('publishes again when only the JS changed', async () => {
    const page = await pageWithCode();
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    await cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft({ html: '<p>Old</p>', css: '.old{}', js: 'root.x = 2;' }), USER);
    const live = await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    expect(live.published).toMatchObject({ version: 2, js: 'root.x = 2;' });
  });

  it('does nothing for an unchanged draft', async () => {
    const page = await pageWithCode();
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    const again = await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    expect(again.published.version).toBe(1);
    expect(await CmsVersionModel.countDocuments({ owner_id: page._id })).toBe(1);
  });

  it('publishes a document with no draft parts at all as empty strings', async () => {
    const id = new Types.ObjectId();
    const siteId = new Types.ObjectId();
    // A model handing back a bare document: nothing saved into draft or published yet.
    const bare = {
      findById: jest.fn(async () => ({ _id: id, site_id: siteId, is_published: false })),
      findByIdAndUpdate: jest.fn(async () => null),
    } as unknown as Model<ICmsPage>;
    const out = await cmsContentService.publish(bare, 'PAGE', id.toHexString(), USER);
    expect(out).toMatchObject({ _id: id, is_published: false });
    const version = await CmsVersionModel.findOne({ owner_id: id }).lean();
    expect(version).toMatchObject({ version: 1, project: '', html: '', css: '', scss: '', js: '' });
    expect((bare.findByIdAndUpdate as jest.Mock).mock.calls[0][1].$set.published).toMatchObject({ html: '', css: '', scss: '', js: '', version: 1 });
  });
});

describe('cmsContentService.restore', () => {
  it('puts a version’s SCSS and JS back into the draft', async () => {
    const page = await pageWithCode();
    const version = await CmsVersionModel.create({
      owner_kind: 'PAGE',
      owner_id: page._id,
      site_id: page.site_id,
      version: 1,
      project: '{"v":1}',
      ...content('<p>v1</p>', { css: '.v1{}', scss: '.s1{}', js: 'v1();' }),
    });
    await expect(cmsContentService.restore(version.id, USER)).resolves.toBe(true);
    const restored = await CmsPageModel.findById(page._id).lean();
    expect(restored?.draft).toEqual({ project: '{"v":1}', html: '<p>v1</p>', css: '.v1{}', scss: '.s1{}', js: 'v1();' });
  });

  it('restores a version snapshotted before SCSS and JS existed as empty code', async () => {
    const page = await pageWithCode();
    const legacy = await CmsVersionModel.create({ owner_kind: 'PAGE', owner_id: page._id, site_id: page.site_id, version: 1, project: '{}', html: '<p>legacy</p>' });
    // Stored without the scss/js keys, as a version snapshotted before they existed is.
    await CmsVersionModel.collection.updateOne({ _id: legacy._id }, { $unset: { scss: '', js: '' } });
    await cmsContentService.restore(legacy.id, USER);
    const restored = await CmsPageModel.findById(page._id).lean();
    expect(restored?.draft).toMatchObject({ html: '<p>legacy</p>', scss: '', js: '' });
  });
});

describe('cmsContentService.publishVersion', () => {
  async function pageWithTwoVersions() {
    const page = await pageWithCode();
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    await cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft({ html: '<p>v2</p>', scss: '.v2{}', js: 'v2();' }), USER);
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    const first = await CmsVersionModel.findOne({ owner_id: page._id, version: 1 });
    return { page, first: first! };
  }

  it('makes an old page version live again as a new version, draft and live copy agreeing', async () => {
    const { page, first } = await pageWithTwoVersions();
    await expect(cmsContentService.publishVersion(first.id, 'editor-2')).resolves.toBe(true);
    const live = await CmsPageModel.findById(page._id).lean();
    expect(live?.published).toMatchObject({ version: 3, html: '<p>Old</p>', scss: '$c: blue; .s { color: $c; }', js: 'root.x = 1;', published_by: 'editor-2' });
    expect(live?.draft).toMatchObject({ html: '<p>Old</p>', scss: '$c: blue; .s { color: $c; }', js: 'root.x = 1;' });
    expect(await CmsVersionModel.countDocuments({ owner_id: page._id })).toBe(3);
  });

  it('makes an old component version live again', async () => {
    const site = await makeSite();
    const fragment = await makeFragment(site._id, { draft: { project: '', ...content('<nav>One</nav>', { js: 'one();' }) } });
    await cmsContentService.publish(CmsFragmentModel, 'FRAGMENT', fragment.id, USER);
    await cmsContentService.saveDraft(CmsFragmentModel, 'FRAGMENT', fragment.id, draft({ html: '<nav>Two</nav>', js: 'two();' }), USER);
    await cmsContentService.publish(CmsFragmentModel, 'FRAGMENT', fragment.id, USER);
    const first = await CmsVersionModel.findOne({ owner_id: fragment._id, version: 1 });

    await cmsContentService.publishVersion(first!.id, USER);
    const live = await CmsFragmentModel.findById(fragment._id).lean();
    expect(live?.published).toMatchObject({ version: 3, html: '<nav>One</nav>', js: 'one();' });
  });

  it('reports a version that does not exist as not found, changing nothing', async () => {
    await expect(cmsContentService.publishVersion(new Types.ObjectId().toHexString(), USER)).rejects.toMatchObject({
      message: 'Version not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('refuses an id that is not an id', async () => {
    await expect(cmsContentService.publishVersion('nope', USER)).rejects.toMatchObject({ message: 'Invalid version id' });
  });
});

describe('cmsContentService: publish races, unpublish, history', () => {
  it('turns a version-number collision into a conflict a person can act on', async () => {
    const page = await pageWithCode();
    jest.spyOn(CmsVersionModel, 'create').mockRejectedValueOnce(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));
    await expect(cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER)).rejects.toMatchObject({
      message: 'This page was just published by someone else. Reload and check it.',
      extensions: { code: 'CONFLICT' },
    });
    expect((await CmsPageModel.findById(page._id).lean())?.is_published).toBe(false);
  });

  it('rethrows any other snapshot failure as it is', async () => {
    const page = await pageWithCode();
    jest.spyOn(CmsVersionModel, 'create').mockRejectedValueOnce(new Error('disk full'));
    await expect(cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER)).rejects.toThrow('disk full');
  });

  it('reports publishing something that does not exist as not found', async () => {
    await expect(cmsContentService.publish(CmsFragmentModel, 'FRAGMENT', new Types.ObjectId().toHexString(), USER)).rejects.toMatchObject({
      message: 'Fragment not found',
    });
  });

  it('takes a page off the site, keeping its draft', async () => {
    const page = await pageWithCode();
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    const off = await cmsContentService.unpublish(CmsPageModel, 'PAGE', page.id, 'editor-2');
    expect(off).toMatchObject({ is_published: false, updated_by: 'editor-2' });
    expect(off.draft.html).toBe('<p>Old</p>');
    await expect(cmsContentService.unpublish(CmsPageModel, 'PAGE', new Types.ObjectId().toHexString(), USER)).rejects.toMatchObject({
      message: 'Page not found',
    });
  });

  it('lists versions newest first and drops them with their owner', async () => {
    const page = await pageWithCode();
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    await cmsContentService.saveDraft(CmsPageModel, 'PAGE', page.id, draft(), USER);
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    const versions = await cmsContentService.versions('PAGE', page.id);
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    expect(versions[0]).toMatchObject({ owner_kind: 'PAGE', owner_id: page.id, published_by: USER });
    await cmsContentService.dropVersions('PAGE', page._id as Types.ObjectId);
    expect(await cmsContentService.versions('PAGE', page.id)).toEqual([]);
  });

  it('reports restoring a version whose page was deleted as not found', async () => {
    const page = await pageWithCode();
    const version = await CmsVersionModel.create({ owner_kind: 'FRAGMENT', owner_id: page._id, site_id: page.site_id, version: 1 });
    await expect(cmsContentService.restore(version.id, USER)).rejects.toMatchObject({ message: 'Fragment not found' });
    await expect(cmsContentService.restore(new Types.ObjectId().toHexString(), USER)).rejects.toMatchObject({ message: 'Version not found' });
  });
});

describe('cmsContentService: history is capped', () => {
  it('keeps only the newest 30 versions after a publish', async () => {
    const page = await pageWithCode();
    await CmsVersionModel.insertMany(
      Array.from({ length: 30 }, (_v, i) => ({ owner_kind: 'PAGE', owner_id: page._id, site_id: page.site_id, version: i + 1 }))
    );
    await CmsPageModel.updateOne({ _id: page._id }, { $set: { 'published.version': 30 } });
    await cmsContentService.publish(CmsPageModel, 'PAGE', page.id, USER);
    const kept = await CmsVersionModel.find({ owner_id: page._id }).sort({ version: 1 }).lean();
    expect(kept).toHaveLength(30);
    expect(kept[0].version).toBe(2);
    expect(kept[29].version).toBe(31);
  });
});
