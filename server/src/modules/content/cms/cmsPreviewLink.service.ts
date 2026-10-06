import { signedLink } from '@utils/signed-link';
import { CmsSiteModel, type ICmsSite } from './cmsSite.model';
import { CmsPageModel } from './cmsPage.model';
import { CmsEntryModel } from './cmsEntry.model';
import { CmsFragmentModel } from './cmsFragment.model';
import { CmsVersionModel, type CmsVersionOwner } from './cmsVersion.model';
import { assertId, badInput, collectionPathsOf, idOf, notFound } from './cms.mappers';
import { cmsRenderService } from './cmsRender.service';

/** Long enough to share for a review, short enough that a leaked link soon stops working. */
const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;
const PREVIEW = signedLink('cms-preview', PREVIEW_TTL_MS);

/** The query flag the renderer looks for: the page's real address plus this shows the preview. */
export const PREVIEW_PARAM = 'cms_preview';

/** Where a component preview lives on the site: not a page any visitor can reach without a token. */
export const COMPONENT_PREVIEW_PATH = '/__component';

/** What a preview token names: a page or a component, its draft or one saved version, and (for an entry page) one entry. */
export interface PreviewTarget {
  kind: CmsVersionOwner;
  id: string;
  version: number | null;
  entryId: string | null;
}

const KIND_CODE: Record<CmsVersionOwner, string> = { PAGE: 'P', FRAGMENT: 'F' };

export const encodeTarget = (t: PreviewTarget) => [KIND_CODE[t.kind], t.id, t.version ?? 'draft', t.entryId ?? ''].join(':');

export function decodeTarget(value: string): PreviewTarget | null {
  const [code, id, version, entryId] = value.split(':');
  const kind = (Object.keys(KIND_CODE) as CmsVersionOwner[]).find((k) => KIND_CODE[k] === code);
  if (!kind || !id) return null;
  // Number(), not parseInt: a version of "3a" is malformed, not version 3.
  const number = version === 'draft' ? null : Number(version || Number.NaN);
  if (number !== null && !(Number.isInteger(number) && number > 0)) return null;
  return { kind, id, version: number, entryId: entryId || null };
}

interface Address {
  target: Omit<PreviewTarget, 'version'>;
  host: string;
  path: string;
}

function hostOf(site: ICmsSite): string {
  const host = site.domains[0];
  if (!host) throw badInput(`Add a domain to ${site.name} in its Settings to preview it on the site`);
  return host;
}

/** Where a page lives on its site's first domain — for an entry page, at one entry (the newest unless named). */
async function pageAddress(pageId: string, entryId: string | null): Promise<Address> {
  const page = await CmsPageModel.findById(assertId(pageId, 'page')).exec();
  if (!page) throw notFound('Page');
  const site = await CmsSiteModel.findById(page.site_id).exec();
  if (!site) throw notFound('Site');
  const host = hostOf(site);
  const target = { kind: 'PAGE' as const, id: idOf(page._id), entryId: null };
  if (page.kind === 'PAGE' || !page.collection_type) return { target, host, path: page.path };
  const base = collectionPathsOf(site)[page.collection_type];
  if (page.kind !== 'COLLECTION_DETAIL') return { target, host, path: base };
  const filter = { site_id: site._id, collection_type: page.collection_type };
  const chosen = entryId
    ? await CmsEntryModel.findOne({ ...filter, _id: assertId(entryId, 'entry') }).select('slug').exec()
    : await CmsEntryModel.findOne(filter).sort({ published_at: -1 }).select('slug').exec();
  if (!chosen) throw badInput('Add an entry to this collection to preview its page');
  return { target: { ...target, entryId: idOf(chosen._id) }, host, path: `${base}/${chosen.slug}` };
}

/** A component previews on its own, at a path of the site no visitor reaches without a token. */
async function componentAddress(fragmentId: string): Promise<Address> {
  const fragment = await CmsFragmentModel.findById(assertId(fragmentId, 'component')).exec();
  if (!fragment) throw notFound('Component');
  const site = await CmsSiteModel.findById(fragment.site_id).exec();
  if (!site) throw notFound('Site');
  return { target: { kind: 'FRAGMENT', id: idOf(fragment._id), entryId: null }, host: hostOf(site), path: `${COMPONENT_PREVIEW_PATH}/${fragment.key}` };
}

const addressOf = (kind: CmsVersionOwner, id: string, entryId: string | null) => (kind === 'PAGE' ? pageAddress(id, entryId) : componentAddress(id));

function sign(address: Address, version: number | null) {
  const token = PREVIEW.sign(encodeTarget({ ...address.target, version }));
  return {
    url: `https://${address.host}${address.path}?${PREVIEW_PARAM}=${token}`,
    expires_at: new Date(Date.now() + PREVIEW_TTL_MS).toISOString(),
  };
}

const codeOf = (error: unknown) => (error as { extensions?: { code?: string } })?.extensions?.code;

/**
 * Shareable "live demo" links: a page's real address on its own domain (or a
 * component's own preview address), with a signed `cms_preview` token that
 * makes the renderer show the draft — or one saved version — instead of what
 * is published. Without the flag a page's address is the live page.
 */
export const cmsPreviewLinkService = {
  async link(kind: CmsVersionOwner, id: string, version?: number | null, entryId?: string | null) {
    const address = await addressOf(kind, id, entryId ?? null);
    if (version && !(await CmsVersionModel.exists({ owner_kind: kind, owner_id: address.target.id, version }))) throw notFound('Version');
    return sign(address, version ?? null);
  },

  /** Each saved version with its own live-demo URL; something that cannot be previewed (no domain) gets none. */
  async withPreviewUrls<V extends { version: number }>(kind: CmsVersionOwner, id: string, versions: V[]): Promise<(V & { preview_url: string | null })[]> {
    const address = await addressOf(kind, id, null).catch((error: unknown) => {
      // No domain yet, or an entry page with no entry: the versions still list, just without a link.
      if (codeOf(error) === 'BAD_USER_INPUT') return null;
      throw error;
    });
    return versions.map((v) => ({ ...v, preview_url: address ? sign(address, v.version).url : null }));
  },

  /** Public: what a preview link shows. A forged, expired or foreign token renders nothing. */
  async render(token: string) {
    const value = PREVIEW.verify(token);
    const target = value ? decodeTarget(value) : null;
    if (!target) return null;
    try {
      return target.kind === 'PAGE'
        ? await cmsRenderService.preview(target.id, target.entryId, target.version)
        : await cmsRenderService.previewComponent(target.id, target.version);
    } catch (error) {
      // The page, component or version was deleted after the link was made: nothing to show, not a server error.
      if (codeOf(error) === 'NOT_FOUND') return null;
      throw error;
    }
  },
};
