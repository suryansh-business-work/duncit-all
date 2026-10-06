import { CmsPageModel, type ICmsPage } from './cmsPage.model';
import { cmsSiteService } from './cmsSite.service';
import { cmsContentService } from './cmsContent.service';
import { assertId, badInput, notFound, rethrowDuplicate, seoOf, toPage } from './cms.mappers';
import type { CmsCollection, CmsPageKind } from './cms.constants';
import type { CmsSeo } from './cmsContent.schema-parts';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

export interface CmsPageInput {
  kind: CmsPageKind;
  collection_type: CmsCollection | null;
  title: string;
  path: string;
  seo?: Partial<CmsSeo>;
  show_header: boolean;
  show_footer: boolean;
  head_html: string;
  custom_css: string;
  custom_js: string;
  sort_order: number;
}

const PAGE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'path'],
  sortFields: {
    title: 'title',
    path: 'path',
    kind: 'kind',
    is_published: 'is_published',
    sort_order: 'sort_order',
    updated_at: 'updated_at',
  },
  filterFields: {
    kind: { type: 'enum' },
    collection_type: { type: 'enum' },
    title: { type: 'string' },
    path: { type: 'string' },
    is_published: { type: 'boolean' },
    updated_at: { type: 'date' },
  },
  defaultSort: { kind: 1, sort_order: 1, path: 1 },
};

/** A PAGE needs an address; a template needs a collection and has none. */
function normalise(input: CmsPageInput): CmsPageInput {
  if (input.kind === 'PAGE') {
    if (!input.path) throw badInput('Give the page a path, like /about');
    return { ...input, collection_type: null };
  }
  if (!input.collection_type) throw badInput('Pick the collection this template is for');
  return { ...input, path: '' };
}

const fields = (input: CmsPageInput) => ({
  kind: input.kind,
  collection_type: input.collection_type,
  title: input.title,
  path: input.path,
  seo: seoOf(input.seo),
  show_header: input.show_header,
  show_footer: input.show_footer,
  head_html: input.head_html,
  custom_css: input.custom_css,
  custom_js: input.custom_js,
  sort_order: input.sort_order,
});

const DUPLICATE = 'Another page already uses this path, or this collection already has that template';

export const cmsPageService = {
  async table(siteId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ICmsPage>(
      CmsPageModel,
      { site_id: assertId(siteId, 'site') },
      input,
      PAGE_TABLE_CONFIG,
      // The editor JSON can be megabytes; a table row never needs it.
      { projection: { 'draft.project': 0 } }
    );
    return { rows: docs.map(toPage), total, page, page_size };
  },

  async get(id: string) {
    const page = await CmsPageModel.findById(assertId(id, 'page')).exec();
    return page ? toPage(page) : null;
  },

  async create(siteId: string, input: CmsPageInput, userId: string) {
    const site = await cmsSiteService.requireDoc(siteId);
    try {
      const page = await CmsPageModel.create({ ...fields(normalise(input)), site_id: site._id, updated_by: userId });
      return toPage(page);
    } catch (error) {
      rethrowDuplicate(error, DUPLICATE);
    }
  },

  async update(id: string, input: CmsPageInput, userId: string) {
    try {
      const page = await CmsPageModel.findByIdAndUpdate(
        assertId(id, 'page'),
        { $set: { ...fields(normalise(input)), updated_by: userId } },
        { new: true, runValidators: true }
      );
      if (!page) throw notFound('Page');
      return toPage(page);
    } catch (error) {
      rethrowDuplicate(error, DUPLICATE);
    }
  },

  /** A new unpublished PAGE with the same design, at a new address. */
  async duplicate(id: string, title: string, path: string, userId: string) {
    const source = await CmsPageModel.findById(assertId(id, 'page')).lean();
    if (!source) throw notFound('Page');
    const input = normalise({
      kind: 'PAGE',
      collection_type: null,
      title,
      path,
      seo: source.seo,
      show_header: source.show_header,
      show_footer: source.show_footer,
      head_html: source.head_html,
      custom_css: source.custom_css,
      custom_js: source.custom_js,
      sort_order: source.sort_order,
    });
    try {
      const page = await CmsPageModel.create({ ...fields(input), site_id: source.site_id, draft: source.draft, updated_by: userId });
      return toPage(page);
    } catch (error) {
      rethrowDuplicate(error, DUPLICATE);
    }
  },

  async remove(id: string) {
    const pageId = assertId(id, 'page');
    const result = await CmsPageModel.deleteOne({ _id: pageId });
    if (result.deletedCount > 0) await cmsContentService.dropVersions('PAGE', pageId);
    return result.deletedCount > 0;
  },
};
