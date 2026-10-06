import { signedLink } from '@utils/signed-link';
import { CmsSiteModel } from './cmsSite.model';
import { CmsPageModel } from './cmsPage.model';
import { CmsEntryModel } from './cmsEntry.model';
import { CmsVersionModel } from './cmsVersion.model';
import { assertId, badInput, collectionPathsOf, idOf, notFound } from './cms.mappers';
import { cmsRenderService } from './cmsRender.service';

/** Long enough to share for a review, short enough that a leaked link soon stops working. */
const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;
const PREVIEW = signedLink('cms-preview', PREVIEW_TTL_MS);

/** The query flag the renderer looks for: the page's real address plus this shows the preview. */
export const PREVIEW_PARAM = 'cms_preview';

/** What a preview token names: one page, its draft or one saved version, and (for an entry page) one entry. */
interface PreviewTarget {
  pageId: string;
  version: number | null;
  entryId: string | null;
}

const encode = (t: PreviewTarget) => [t.pageId, t.version ?? 'draft', t.entryId ?? ''].join(':');

function decode(id: string): PreviewTarget | null {
  const [pageId, version, entryId] = id.split(':');
  if (!pageId) return null;
  const number = version === 'draft' ? null : Number.parseInt(version ?? '', 10);
  if (number !== null && !Number.isInteger(number)) return null;
  return { pageId, version: number, entryId: entryId || null };
}

/**
 * Shareable "live demo" links: a page's real address on its own domain, with
 * a signed `cms_preview` token that makes the renderer show the draft — or one
 * saved version — instead of what is published. Without the flag the same
 * address is the live page.
 */
/** Where a page lives on its site's first domain — for an entry page, at one entry (the newest unless named). */
async function addressOf(pageId: string, entryId: string | null) {
  const page = await CmsPageModel.findById(assertId(pageId, 'page')).exec();
  if (!page) throw notFound('Page');
  const site = await CmsSiteModel.findById(page.site_id).exec();
  if (!site) throw notFound('Site');
  const host = site.domains[0];
  if (!host) throw badInput(`Add a domain to ${site.name} in its Settings to preview it on the site`);
  if (page.kind === 'PAGE' || !page.collection_type) return { page, host, path: page.path, entryId };
  const base = collectionPathsOf(site)[page.collection_type];
  if (page.kind !== 'COLLECTION_DETAIL') return { page, host, path: base, entryId: null };
  const filter = { site_id: site._id, collection_type: page.collection_type };
  const chosen = entryId
    ? await CmsEntryModel.findOne({ ...filter, _id: assertId(entryId, 'entry') }).select('slug').exec()
    : await CmsEntryModel.findOne(filter).sort({ published_at: -1 }).select('slug').exec();
  if (!chosen) throw badInput('Add an entry to this collection to preview its page');
  return { page, host, path: `${base}/${chosen.slug}`, entryId: idOf(chosen._id) };
}

type Address = Awaited<ReturnType<typeof addressOf>>;

function sign(address: Address, version: number | null) {
  const token = PREVIEW.sign(encode({ pageId: idOf(address.page._id), version, entryId: address.entryId }));
  return {
    url: `https://${address.host}${address.path}?${PREVIEW_PARAM}=${token}`,
    expires_at: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
  };
}

export const cmsPreviewLinkService = {
  async link(pageId: string, version?: number | null, entryId?: string | null) {
    const address = await addressOf(pageId, entryId ?? null);
    if (version && !(await CmsVersionModel.exists({ owner_kind: 'PAGE', owner_id: address.page._id, version }))) throw notFound('Version');
    return sign(address, version ?? null);
  },

  /** Each of a page's saved versions with its own live-demo URL; a page that cannot be previewed (no domain) gets none. */
  async withPreviewUrls<V extends { version: number }>(pageId: string, versions: V[]): Promise<(V & { preview_url: string | null })[]> {
    const address = await addressOf(pageId, null).catch((error: unknown) => {
      // No domain yet, or an entry page with no entry: the versions still list, just without a link.
      if ((error as { extensions?: { code?: string } })?.extensions?.code === 'BAD_USER_INPUT') return null;
      throw error;
    });
    return versions.map((v) => ({ ...v, preview_url: address ? sign(address, v.version).url : null }));
  },

  /** Public: what a preview link shows. A forged, expired or foreign token renders nothing. */
  async render(token: string) {
    const id = PREVIEW.verify(token);
    const target = id ? decode(id) : null;
    if (!target) return null;
    try {
      return await cmsRenderService.preview(target.pageId, target.entryId, target.version);
    } catch (error) {
      // The page or version was deleted after the link was made: nothing to show, not a server error.
      if ((error as { extensions?: { code?: string } })?.extensions?.code === 'NOT_FOUND') return null;
      throw error;
    }
  },
};
