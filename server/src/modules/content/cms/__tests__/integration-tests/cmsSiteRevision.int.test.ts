import { Types } from 'mongoose';
import { cmsSiteRevisionService } from '../../cmsSiteRevision.service';
import { CmsSiteRevisionModel } from '../../cmsSiteRevision.model';
import { CmsSiteModel } from '../../cmsSite.model';
import { makeSite } from './cms.fixtures';

const USER = 'editor-1';
const code = (over: Record<string, string> = {}) => ({
  head_html: '<meta name="x" content="y">',
  body_end_html: '',
  custom_css: '$gap: 8px;\n.stack > * + * { margin-top: $gap; }',
  custom_js: 'window.siteReady = true;',
  ...over,
});
const duplicateKey = () => Object.assign(new Error('E11000 duplicate key'), { code: 11000 });

beforeAll(() => CmsSiteRevisionModel.init());

describe('saving the site code', () => {
  it('saves SCSS and script that compile, and records the save as a revision', async () => {
    const site = await makeSite();
    const out = await cmsSiteRevisionService.save(site.id, 'CODE', code(), USER);
    expect(out).toMatchObject({ custom_css: code().custom_css, custom_js: 'window.siteReady = true;' });
    const [revision] = await cmsSiteRevisionService.list(site.id);
    expect(revision).toMatchObject({ revision: 1, section: 'CODE', restored_from: null, saved_by: USER });
  });

  it.each([
    ['custom_css', '.a { color: ; }', /^Site CSS — line 1, column \d+: /],
    ['custom_js', 'function (', /^Site JavaScript — line 1, column \d+: /],
  ])('refuses %s that does not compile, saving and recording nothing', async (field, source, message) => {
    const site = await makeSite({ custom_css: '.kept{}' });
    await expect(cmsSiteRevisionService.save(site.id, 'CODE', code({ [field]: source }), USER)).rejects.toMatchObject({
      message: expect.stringMatching(message),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect((await CmsSiteModel.findById(site._id).lean())?.custom_css).toBe('.kept{}');
    expect(await CmsSiteRevisionModel.countDocuments()).toBe(0);
  });
});

describe('saving the design system', () => {
  it('saves a base stylesheet that compiles', async () => {
    const site = await makeSite();
    const out = await cmsSiteRevisionService.save(site.id, 'DESIGN', { base_css: 'body { margin: 0; }', tokens: [{ name: '--c', value: 'red' }] }, USER);
    expect(out?.design).toMatchObject({ base_css: 'body { margin: 0; }', tokens: [{ name: '--c', value: 'red', group: 'color' }] });
    expect((await cmsSiteRevisionService.list(site.id, 'DESIGN')).map((r) => r.section)).toEqual(['DESIGN']);
  });

  it('refuses a base stylesheet that does not compile, naming its line', async () => {
    const site = await makeSite();
    await expect(cmsSiteRevisionService.save(site.id, 'DESIGN', { base_css: 'body {\n  margin: $x;\n}' }, USER)).rejects.toMatchObject({
      message: expect.stringMatching(/^Base stylesheet — line 2, column \d+: Undefined variable\./),
    });
    expect(await CmsSiteRevisionModel.countDocuments()).toBe(0);
  });
});

describe('saving the settings', () => {
  it('saves and records the settings', async () => {
    const site = await makeSite();
    const out = await cmsSiteRevisionService.save(site.id, 'SETTINGS', { key: site.key, name: 'Renamed', domains: ['renamed.duncit.test'] }, USER);
    expect(out).toMatchObject({ name: 'Renamed', domains: ['renamed.duncit.test'] });
    expect(await cmsSiteRevisionService.list(site.id, 'SETTINGS')).toHaveLength(1);
  });

  it('refuses invalid settings through the same validation as the form', async () => {
    const site = await makeSite();
    await expect(cmsSiteRevisionService.save(site.id, 'SETTINGS', { key: site.key, name: '' }, USER)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('the revision history', () => {
  it('lists every section newest first, or one section', async () => {
    const site = await makeSite();
    await cmsSiteRevisionService.save(site.id, 'CODE', code(), USER);
    await cmsSiteRevisionService.save(site.id, 'DESIGN', { base_css: '' }, USER);
    await cmsSiteRevisionService.save(site.id, 'CODE', code({ custom_js: '' }), USER);
    expect((await cmsSiteRevisionService.list(site.id)).map((r) => [r.revision, r.section])).toEqual([
      [3, 'CODE'],
      [2, 'DESIGN'],
      [1, 'CODE'],
    ]);
    expect((await cmsSiteRevisionService.list(site.id, 'CODE')).map((r) => r.revision)).toEqual([3, 1]);
    expect(await cmsSiteRevisionService.list(site.id, null)).toHaveLength(3);
  });

  it('restores a revision through the normal save, as a new revision that says where it came from', async () => {
    const site = await makeSite();
    await cmsSiteRevisionService.save(site.id, 'CODE', code({ custom_js: 'first();' }), USER);
    await cmsSiteRevisionService.save(site.id, 'CODE', code({ custom_js: 'second();' }), USER);
    const first = (await cmsSiteRevisionService.list(site.id)).find((r) => r.revision === 1)!;

    const out = await cmsSiteRevisionService.restore(first.id, 'editor-2');
    expect(out?.custom_js).toBe('first();');
    const [latest] = await cmsSiteRevisionService.list(site.id);
    expect(latest).toMatchObject({ revision: 3, restored_from: 1, saved_by: 'editor-2' });
  });

  it('refuses to restore code that no longer passes today’s checks', async () => {
    const site = await makeSite();
    await CmsSiteRevisionModel.create({ site_id: site._id, revision: 1, section: 'CODE', data: JSON.stringify(code({ custom_css: '.a { color: ; }' })) });
    const [old] = await cmsSiteRevisionService.list(site.id);
    await expect(cmsSiteRevisionService.restore(old.id, USER)).rejects.toThrow(/^Site CSS/);
  });

  it('reports a revision that cannot be read, or does not exist', async () => {
    const site = await makeSite();
    const broken = await CmsSiteRevisionModel.create({ site_id: site._id, revision: 4, section: 'CODE', data: '{not json' });
    await expect(cmsSiteRevisionService.restore(broken.id, USER)).rejects.toMatchObject({
      message: 'Revision 4 could not be read',
      extensions: { code: 'BAD_USER_INPUT' },
    });
    await expect(cmsSiteRevisionService.restore(new Types.ObjectId().toHexString(), USER)).rejects.toMatchObject({ message: 'Revision not found' });
  });

  it('keeps the newest 30 revisions of a section', async () => {
    const site = await makeSite();
    await CmsSiteRevisionModel.insertMany(
      Array.from({ length: 30 }, (_v, i) => ({ site_id: site._id, revision: i + 1, section: 'CODE', data: '{}' }))
    );
    await cmsSiteRevisionService.save(site.id, 'CODE', code(), USER);
    const kept = await cmsSiteRevisionService.list(site.id, 'CODE');
    expect(kept).toHaveLength(30);
    expect(kept[0].revision).toBe(31);
    expect(kept[29].revision).toBe(2);
  });

  it('retries when another save took the same revision number', async () => {
    const site = await makeSite();
    const create = CmsSiteRevisionModel.create.bind(CmsSiteRevisionModel);
    const spy = jest.spyOn(CmsSiteRevisionModel, 'create').mockRejectedValueOnce(duplicateKey() as never);
    spy.mockImplementation(create as never);
    await cmsSiteRevisionService.save(site.id, 'CODE', code(), USER);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(await cmsSiteRevisionService.list(site.id)).toHaveLength(1);
  });

  it('gives up after three collisions, and never retries other failures', async () => {
    const site = await makeSite();
    const spy = jest.spyOn(CmsSiteRevisionModel, 'create').mockRejectedValue(duplicateKey() as never);
    await expect(cmsSiteRevisionService.save(site.id, 'CODE', code(), USER)).rejects.toMatchObject({ code: 11000 });
    expect(spy).toHaveBeenCalledTimes(3);

    spy.mockReset().mockRejectedValue(new Error('write concern') as never);
    await expect(cmsSiteRevisionService.save(site.id, 'CODE', code(), USER)).rejects.toThrow('write concern');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
