import type { Types } from 'mongoose';
import { CmsSiteModel, type ICmsSite } from '../../cmsSite.model';
import { CmsPageModel, type ICmsPage } from '../../cmsPage.model';
import { CmsFragmentModel, type ICmsFragment } from '../../cmsFragment.model';
import { CmsEntryModel, type ICmsEntry } from '../../cmsEntry.model';
import { CmsVersionModel, type ICmsVersion } from '../../cmsVersion.model';

/** Test data for the CMS integration suites: real documents in the in-memory database. */

let sequence = 0;
const next = () => (sequence += 1);

export const makeSite = (over: Partial<Record<keyof ICmsSite, unknown>> = {}): Promise<ICmsSite> =>
  CmsSiteModel.create({ key: `site-${next()}`, name: 'Duncit', domains: [`site${sequence}.duncit.test`], ...over });

export const makePage = (siteId: Types.ObjectId | unknown, over: Partial<Record<keyof ICmsPage, unknown>> = {}): Promise<ICmsPage> =>
  CmsPageModel.create({ site_id: siteId, title: 'Page', path: `/page-${next()}`, ...over });

export const makeFragment = (
  siteId: Types.ObjectId | unknown,
  over: Partial<Record<keyof ICmsFragment, unknown>> = {}
): Promise<ICmsFragment> => CmsFragmentModel.create({ site_id: siteId, key: `part-${next()}`, name: 'Part', ...over });

export const makeEntry = (siteId: Types.ObjectId | unknown, over: Partial<Record<keyof ICmsEntry, unknown>> = {}): Promise<ICmsEntry> =>
  CmsEntryModel.create({
    site_id: siteId,
    collection_type: 'BLOG',
    title: 'Post',
    slug: `post-${next()}`,
    is_published: true,
    published_at: new Date('2026-01-01T00:00:00Z'),
    ...over,
  });

export const makeVersion = (
  owner: { _id: unknown; site_id: unknown },
  kind: 'PAGE' | 'FRAGMENT',
  over: Partial<Record<keyof ICmsVersion, unknown>> = {}
): Promise<ICmsVersion> =>
  CmsVersionModel.create({ owner_kind: kind, owner_id: owner._id, site_id: owner.site_id, version: 1, ...over });

/** The live copy and draft of a page or component, as the editor would have saved and published them. */
export const content = (html: string, extra: { css?: string; scss?: string; js?: string } = {}) => ({
  html,
  css: extra.css ?? '',
  scss: extra.scss ?? '',
  js: extra.js ?? '',
});
