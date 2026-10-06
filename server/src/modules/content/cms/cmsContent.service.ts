import type { Model, Types } from 'mongoose';
import { CmsVersionModel, type CmsVersionOwner } from './cmsVersion.model';
import { CmsPageModel } from './cmsPage.model';
import { CmsFragmentModel } from './cmsFragment.model';
import { assertId, conflict, hasUnpublishedChanges, notFound, toVersion } from './cms.mappers';
import { CMS_VERSIONS_KEPT } from './cms.constants';
import { assertValid } from './cmsCode.service';
import type { CmsDraft, CmsPublished } from './cmsContent.schema-parts';

/** What pages and fragments share: a draft, a published copy, a site. */
interface Publishable {
  _id: Types.ObjectId;
  site_id: Types.ObjectId;
  draft: CmsDraft;
  published: CmsPublished;
  is_published: boolean;
  updated_at: Date;
}

export interface CmsDraftInput {
  project: string;
  html: string;
  css: string;
  /** Omitted: the saved SCSS / JS stay as they are (the visual editor sends neither). */
  scss?: string;
  js?: string;
  base_updated_at?: string | null;
}

/** Field by field, so a save that leaves out the SCSS or JS keeps them. */
function draftUpdate(input: CmsDraftInput, userId: string): Record<string, string> {
  const update: Record<string, string> = { 'draft.project': input.project, 'draft.html': input.html, 'draft.css': input.css, updated_by: userId };
  if (input.scss !== undefined) update['draft.scss'] = input.scss;
  if (input.js !== undefined) update['draft.js'] = input.js;
  return update;
}

const LABEL: Record<CmsVersionOwner, string> = { PAGE: 'Page', FRAGMENT: 'Fragment' };

/** Keeps the newest CMS_VERSIONS_KEPT snapshots of one page or fragment. */
async function prune(owner: CmsVersionOwner, ownerId: Types.ObjectId) {
  const stale = await CmsVersionModel.find({ owner_kind: owner, owner_id: ownerId })
    .sort({ version: -1 })
    .skip(CMS_VERSIONS_KEPT)
    .select('_id')
    .lean();
  if (stale.length) await CmsVersionModel.deleteMany({ _id: { $in: stale.map((v) => v._id) } });
}

export const cmsContentService = {
  /**
   * Saves the editor's output into the draft. Never touches the live copy.
   *
   * `base_updated_at` is the `updated_at` the editor loaded: when it no longer
   * matches, someone else saved in between, and writing would silently throw
   * their work away — so the save is refused instead. The match is part of the
   * update filter, so two saves racing each other cannot both win.
   */
  async saveDraft<T extends Publishable>(model: Model<T>, owner: CmsVersionOwner, id: string, input: CmsDraftInput, userId: string) {
    // Code that would not compile never reaches a draft, let alone the live site.
    await assertValid('SCSS', input.css, 'The CSS');
    await assertValid('SCSS', input.scss ?? '', 'The SCSS');
    await assertValid('JS', input.js ?? '', 'The JavaScript');
    const filter: Record<string, unknown> = { _id: assertId(id, owner.toLowerCase()) };
    if (input.base_updated_at) filter.updated_at = new Date(input.base_updated_at);
    const saved = await model.findOneAndUpdate(
      filter,
      { $set: draftUpdate(input, userId) },
      { new: true }
    );
    if (saved) return saved;
    if (!(await model.exists({ _id: filter._id }))) throw notFound(LABEL[owner]);
    throw conflict(`Someone else saved this ${owner.toLowerCase()} after you opened it. Reload to see their changes, then redo yours.`);
  },

  /**
   * Makes the draft live and snapshots it. Publishing an unchanged draft is a
   * no-op rather than a new version, so a double click costs nothing; two
   * people publishing at once collide on the version's unique index.
   */
  async publish<T extends Publishable>(model: Model<T>, owner: CmsVersionOwner, id: string, userId: string) {
    const doc = await model.findById(assertId(id, owner.toLowerCase()));
    if (!doc) throw notFound(LABEL[owner]);
    if (!hasUnpublishedChanges(doc)) return doc;

    const version = (doc.published?.version ?? 0) + 1;
    try {
      await CmsVersionModel.create({
        owner_kind: owner,
        owner_id: doc._id,
        site_id: doc.site_id,
        version,
        project: doc.draft?.project ?? '',
        html: doc.draft?.html ?? '',
        css: doc.draft?.css ?? '',
        scss: doc.draft?.scss ?? '',
        js: doc.draft?.js ?? '',
        published_by: userId,
      });
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        throw conflict(`This ${owner.toLowerCase()} was just published by someone else. Reload and check it.`);
      }
      throw error;
    }
    const published = await model.findByIdAndUpdate(
      doc._id,
      {
        $set: {
          published: { html: doc.draft?.html ?? '', css: doc.draft?.css ?? '', scss: doc.draft?.scss ?? '', js: doc.draft?.js ?? '', version, published_at: new Date(), published_by: userId },
          is_published: true,
          updated_by: userId,
        },
      },
      { new: true }
    );
    await prune(owner, doc._id);
    return published ?? doc;
  },

  /** Takes it off the live site; the draft and the history stay. */
  async unpublish<T extends Publishable>(model: Model<T>, owner: CmsVersionOwner, id: string, userId: string) {
    const doc = await model.findByIdAndUpdate(
      assertId(id, owner.toLowerCase()),
      { $set: { is_published: false, updated_by: userId } },
      { new: true }
    );
    if (!doc) throw notFound(LABEL[owner]);
    return doc;
  },

  async versions(owner: CmsVersionOwner, ownerId: string) {
    const docs = await CmsVersionModel.find({ owner_kind: owner, owner_id: assertId(ownerId, owner.toLowerCase()) })
      .select('-project -html -css')
      .sort({ version: -1 })
      .exec();
    return docs.map(toVersion);
  },

  /** Puts an old version back into the DRAFT. Going live is still a publish. */
  async restore(versionId: string, userId: string) {
    const version = await CmsVersionModel.findById(assertId(versionId, 'version'));
    if (!version) throw notFound('Version');
    const update = {
      $set: { draft: { project: version.project, html: version.html, css: version.css, scss: version.scss, js: version.js }, updated_by: userId },
    };
    const doc =
      version.owner_kind === 'PAGE'
        ? await CmsPageModel.findByIdAndUpdate(version.owner_id, update)
        : await CmsFragmentModel.findByIdAndUpdate(version.owner_id, update);
    if (!doc) throw notFound(LABEL[version.owner_kind]);
    return true;
  },

  /**
   * Makes one saved version live: it replaces the draft, then publishes as
   * usual — so the live copy, the draft and the history all agree, and the
   * version just made live gets its own new entry in that history.
   */
  async publishVersion(versionId: string, userId: string) {
    const version = await CmsVersionModel.findById(assertId(versionId, 'version'));
    if (!version) throw notFound('Version');
    await this.restore(versionId, userId);
    const id = String(version.owner_id);
    if (version.owner_kind === 'PAGE') await this.publish(CmsPageModel, 'PAGE', id, userId);
    else await this.publish(CmsFragmentModel, 'FRAGMENT', id, userId);
    return true;
  },

  /** Removes a page's or fragment's history with it. */
  async dropVersions(owner: CmsVersionOwner, ownerId: Types.ObjectId) {
    await CmsVersionModel.deleteMany({ owner_kind: owner, owner_id: ownerId });
  },
};
