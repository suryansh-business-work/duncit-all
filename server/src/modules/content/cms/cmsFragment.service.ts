import { CmsFragmentModel, type ICmsFragment } from './cmsFragment.model';
import { CmsPageModel } from './cmsPage.model';
import { CmsSiteModel } from './cmsSite.model';
import { cmsSiteService } from './cmsSite.service';
import { cmsContentService } from './cmsContent.service';
import { assertId, badInput, notFound, rethrowDuplicate, toFragment } from './cms.mappers';
import type { CmsFragmentKind } from './cms.constants';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { escapeRegExp } from '@utils/regex';

export interface CmsFragmentInput {
  key: string;
  name: string;
  kind: CmsFragmentKind;
}

/** How a page holds a SECTION fragment — the exact markup the editor emits. */
export const fragmentTag = (key: string) => `<cms-fragment data-key="${key}"></cms-fragment>`;

const FRAGMENT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'key'],
  sortFields: { name: 'name', key: 'key', kind: 'kind', is_published: 'is_published', updated_at: 'updated_at' },
  filterFields: {
    kind: { type: 'enum' },
    name: { type: 'string' },
    key: { type: 'string' },
    is_published: { type: 'boolean' },
    updated_at: { type: 'date' },
  },
  defaultSort: { kind: 1, name: 1 },
};

const DUPLICATE = 'This site already has a fragment with that key';

export const cmsFragmentService = {
  async table(siteId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ICmsFragment>(
      CmsFragmentModel,
      { site_id: assertId(siteId, 'site') },
      input,
      FRAGMENT_TABLE_CONFIG,
      { projection: { 'draft.project': 0 } }
    );
    return { rows: docs.map(toFragment), total, page, page_size };
  },

  /** Every fragment of a site, light: for pickers and the editor's block list. */
  async list(siteId: string) {
    const docs = await CmsFragmentModel.find({ site_id: assertId(siteId, 'site') })
      .select('-draft.project')
      .sort({ kind: 1, name: 1 })
      .exec();
    return docs.map(toFragment);
  },

  async get(id: string) {
    const fragment = await CmsFragmentModel.findById(assertId(id, 'fragment')).exec();
    return fragment ? toFragment(fragment) : null;
  },

  async create(siteId: string, input: CmsFragmentInput, userId: string) {
    const site = await cmsSiteService.requireDoc(siteId);
    try {
      return toFragment(await CmsFragmentModel.create({ ...input, site_id: site._id, updated_by: userId }));
    } catch (error) {
      rethrowDuplicate(error, DUPLICATE);
    }
  },

  /** The key is how pages refer to a fragment, so it cannot change once used. */
  async update(id: string, input: CmsFragmentInput, userId: string) {
    const current = await CmsFragmentModel.findById(assertId(id, 'fragment'));
    if (!current) throw notFound('Fragment');
    if (current.key !== input.key && (await this.usedOnPages(current))) {
      throw badInput(`Pages use "${current.key}" — its key cannot change. Create a new fragment instead.`);
    }
    try {
      const fragment = await CmsFragmentModel.findByIdAndUpdate(
        current._id,
        { $set: { ...input, updated_by: userId } },
        { new: true, runValidators: true }
      );
      return toFragment(fragment ?? current);
    } catch (error) {
      rethrowDuplicate(error, DUPLICATE);
    }
  },

  async usedOnPages(fragment: Pick<ICmsFragment, 'site_id' | 'key'>) {
    const tag = fragmentTag(fragment.key);
    const used = await CmsPageModel.exists({
      site_id: fragment.site_id,
      $or: [{ 'draft.html': { $regex: escapeRegExp(tag) } }, { 'published.html': { $regex: escapeRegExp(tag) } }],
    });
    return Boolean(used);
  },

  /** Refused while a site wears it as header/footer or a page embeds it —
   * either would leave a hole in a live page. */
  async remove(id: string) {
    const fragment = await CmsFragmentModel.findById(assertId(id, 'fragment'));
    if (!fragment) return false;
    const chrome = await CmsSiteModel.exists({
      $or: [{ header_fragment_id: fragment._id }, { footer_fragment_id: fragment._id }],
    });
    if (chrome) throw badInput('This is a site header or footer. Pick another one in Settings first.');
    if (await this.usedOnPages(fragment)) throw badInput('Pages still use this fragment. Remove it from them first.');
    await CmsFragmentModel.deleteOne({ _id: fragment._id });
    await cmsContentService.dropVersions('FRAGMENT', fragment._id);
    return true;
  },
};
