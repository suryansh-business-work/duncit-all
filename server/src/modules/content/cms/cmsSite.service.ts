import { Types } from 'mongoose';
import { CmsSiteModel, type CmsDesign, type ICmsSite } from './cmsSite.model';
import { CmsPageModel } from './cmsPage.model';
import { CmsFragmentModel } from './cmsFragment.model';
import { CmsEntryModel } from './cmsEntry.model';
import { assertId, badInput, conflict, notFound, rethrowDuplicate, seoOf, toSite } from './cms.mappers';
import type { CmsCollection } from './cms.constants';

export interface CmsSiteInput {
  key: string;
  name: string;
  domains: string[];
  legacy_site: ICmsSite['legacy_site'];
  is_active: boolean;
  favicon_url: string;
  seo?: { title?: string; description?: string; og_image_url?: string };
  header_fragment_id: string | null;
  footer_fragment_id: string | null;
  collections: CmsCollection[];
  collection_paths: { collection: CmsCollection; path: string }[];
}

export interface CmsSiteCodeInput {
  head_html: string;
  body_end_html: string;
  custom_css: string;
  custom_js: string;
}

/** Page counts for every site in one round trip, for the Websites list. */
async function pageCounts(): Promise<Map<string, number>> {
  const rows = await CmsPageModel.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { kind: 'PAGE' } },
    { $group: { _id: '$site_id', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.n]));
}

/** No two sites may answer on the same hostname. Checked first for a clear
 * message; the partial unique index is what actually guarantees it. */
async function assertDomainsFree(domains: string[], exceptId?: Types.ObjectId) {
  const unique = [...new Set(domains)];
  if (unique.length !== domains.length) throw badInput('A domain is listed twice');
  if (unique.length === 0) return;
  const filter: Record<string, unknown> = { domains: { $in: unique } };
  if (exceptId) filter._id = { $ne: exceptId };
  const clash = await CmsSiteModel.findOne(filter).select('name domains').lean();
  if (clash) {
    const taken = clash.domains.filter((d) => unique.includes(d));
    throw conflict(`${taken.join(', ')} already belongs to the site "${clash.name}"`);
  }
}

/** Two collections at one path would make one of them unreachable. */
function assertCollectionPathsDistinct(paths: { path: string }[]) {
  const seen = new Set<string>();
  for (const { path } of paths) {
    if (path === '/') throw badInput('A collection cannot live at the home page');
    if (seen.has(path)) throw badInput(`Two collections use the path ${path}`);
    seen.add(path);
  }
}

/** A site's header/footer must be one of ITS fragments, of the right kind. */
async function assertChrome(siteId: Types.ObjectId | null, input: CmsSiteInput) {
  for (const [field, kind] of [
    ['header_fragment_id', 'HEADER'],
    ['footer_fragment_id', 'FOOTER'],
  ] as const) {
    const id = input[field];
    if (!id) continue;
    if (!siteId) throw badInput('Create the site before choosing its header and footer');
    const fragment = await CmsFragmentModel.findOne({ _id: assertId(id, 'fragment'), site_id: siteId }).select('kind').lean();
    if (fragment?.kind !== kind) throw badInput(`Pick a ${kind.toLowerCase()} fragment of this site`);
  }
}

const fields = (input: CmsSiteInput) => ({
  key: input.key,
  name: input.name,
  domains: input.domains,
  legacy_site: input.legacy_site ?? null,
  is_active: input.is_active,
  favicon_url: input.favicon_url,
  // The model keeps no canonical address or noindex for a site (those are per page) and drops them.
  seo: seoOf(input.seo),
  header_fragment_id: input.header_fragment_id ? new Types.ObjectId(input.header_fragment_id) : null,
  footer_fragment_id: input.footer_fragment_id ? new Types.ObjectId(input.footer_fragment_id) : null,
  collections: [...new Set(input.collections)],
  collection_paths: input.collection_paths,
});

export const cmsSiteService = {
  async list() {
    const [sites, counts] = await Promise.all([CmsSiteModel.find().sort({ name: 1 }).exec(), pageCounts()]);
    return sites.map((site) => toSite(site, counts.get(String(site._id)) ?? 0));
  },

  async get(id: string) {
    const site = await CmsSiteModel.findById(assertId(id, 'site')).exec();
    if (!site) return null;
    const pageCount = await CmsPageModel.countDocuments({ site_id: site._id, kind: 'PAGE' });
    return toSite(site, pageCount);
  },

  /** The raw document, for the other CMS services. */
  async requireDoc(id: string | Types.ObjectId): Promise<ICmsSite> {
    const site = await CmsSiteModel.findById(typeof id === 'string' ? assertId(id, 'site') : id).exec();
    if (!site) throw notFound('Site');
    return site;
  },

  async create(input: CmsSiteInput) {
    await assertDomainsFree(input.domains);
    assertCollectionPathsDistinct(input.collection_paths);
    await assertChrome(null, input);
    try {
      return toSite(await CmsSiteModel.create(fields(input)));
    } catch (error) {
      rethrowDuplicate(error, 'A site with this key or domain already exists');
    }
  },

  async update(id: string, input: CmsSiteInput) {
    const siteId = assertId(id, 'site');
    await assertDomainsFree(input.domains, siteId);
    assertCollectionPathsDistinct(input.collection_paths);
    await assertChrome(siteId, input);
    try {
      const site = await CmsSiteModel.findByIdAndUpdate(siteId, { $set: fields(input) }, { new: true, runValidators: true });
      if (!site) throw notFound('Site');
      return this.get(id);
    } catch (error) {
      rethrowDuplicate(error, 'A site with this key or domain already exists');
    }
  },

  async updateDesign(id: string, design: CmsDesign) {
    const site = await CmsSiteModel.findByIdAndUpdate(assertId(id, 'site'), { $set: { design } }, { new: true, runValidators: true });
    if (!site) throw notFound('Site');
    return this.get(id);
  },

  async updateCode(id: string, input: CmsSiteCodeInput) {
    const site = await CmsSiteModel.findByIdAndUpdate(assertId(id, 'site'), { $set: input }, { new: true });
    if (!site) throw notFound('Site');
    return this.get(id);
  },

  /** Refuses while the site still has content: deleting a site's pages, posts
   * and fragments is one click too many to undo. Empty it first. */
  async remove(id: string) {
    const siteId = assertId(id, 'site');
    const [pages, fragments, entries] = await Promise.all([
      CmsPageModel.countDocuments({ site_id: siteId }),
      CmsFragmentModel.countDocuments({ site_id: siteId }),
      CmsEntryModel.countDocuments({ site_id: siteId }),
    ]);
    if (pages + fragments + entries > 0) {
      throw badInput(`Delete this site's ${pages} page(s), ${fragments} fragment(s) and ${entries} entr(ies) first`);
    }
    const result = await CmsSiteModel.deleteOne({ _id: siteId });
    return result.deletedCount > 0;
  },
};
