import type { Types } from 'mongoose';
import { validate } from '@utils/validate';
import { CMS_VERSIONS_KEPT } from './cms.constants';
import { cmsDesignInputSchema, cmsSiteCodeInputSchema, cmsSiteInputSchema } from './cms.validator';
import { assertId, badInput, notFound } from './cms.mappers';
import { cmsSiteService } from './cmsSite.service';
import { assertValid } from './cmsCode.service';
import { CmsSiteRevisionModel, type CmsSiteSection, type ICmsSiteRevision } from './cmsSiteRevision.model';

/** Two editors saving the same site at once both read the same last number; the loser retries. */
const NUMBER_RETRIES = 3;

async function nextRevision(siteId: Types.ObjectId): Promise<number> {
  const last = await CmsSiteRevisionModel.findOne({ site_id: siteId }).sort({ revision: -1 }).select('revision').lean();
  return (last?.revision ?? 0) + 1;
}

/** Keeps the newest CMS_VERSIONS_KEPT revisions of each section of one site. */
async function prune(siteId: Types.ObjectId, section: CmsSiteSection) {
  const stale = await CmsSiteRevisionModel.find({ site_id: siteId, section })
    .sort({ revision: -1 })
    .skip(CMS_VERSIONS_KEPT)
    .select('_id')
    .lean();
  if (stale.length) await CmsSiteRevisionModel.deleteMany({ _id: { $in: stale.map((r) => r._id) } });
}

async function record(siteId: string, section: CmsSiteSection, data: unknown, by: string, restoredFrom: number | null = null) {
  const id = assertId(siteId, 'site');
  for (let attempt = 1; attempt <= NUMBER_RETRIES; attempt += 1) {
    try {
      await CmsSiteRevisionModel.create({
        site_id: id,
        revision: await nextRevision(id),
        section,
        data: JSON.stringify(data),
        restored_from: restoredFrom,
        saved_by: by,
      });
      await prune(id, section);
      return;
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000 || attempt === NUMBER_RETRIES) throw error;
    }
  }
}

const toRevision = (doc: ICmsSiteRevision) => ({
  id: String(doc._id),
  revision: doc.revision,
  section: doc.section,
  restored_from: doc.restored_from,
  saved_by: doc.saved_by,
  created_at: doc.created_at.toISOString(),
});

/** One validated save per section — the same path a form save and a restore both take. */
async function save(siteId: string, section: CmsSiteSection, raw: unknown, by: string, restoredFrom: number | null = null) {
  switch (section) {
    case 'SETTINGS': {
      const input = await validate(cmsSiteInputSchema, raw);
      const site = await cmsSiteService.update(siteId, input);
      await record(siteId, section, input, by, restoredFrom);
      return site;
    }
    case 'DESIGN': {
      const input = await validate(cmsDesignInputSchema, raw);
      await assertValid('SCSS', input.base_css, 'Base stylesheet');
      const site = await cmsSiteService.updateDesign(siteId, input);
      await record(siteId, section, input, by, restoredFrom);
      return site;
    }
    case 'CODE': {
      const input = await validate(cmsSiteCodeInputSchema, raw);
      await assertValid('SCSS', input.custom_css, 'Site CSS');
      await assertValid('JS', input.custom_js, 'Site JavaScript');
      const site = await cmsSiteService.updateCode(siteId, input);
      await record(siteId, section, input, by, restoredFrom);
      return site;
    }
  }
}

/**
 * A website's revision history: its settings, design system and site code,
 * snapshotted at every save. Restoring replays a snapshot through today's
 * validation and the normal save, so a restore is itself a new revision —
 * undoing a restore is just restoring the one before it.
 */
export const cmsSiteRevisionService = {
  save,

  async list(siteId: string, section?: CmsSiteSection | null) {
    const filter = { site_id: assertId(siteId, 'site'), ...(section ? { section } : {}) };
    const docs = await CmsSiteRevisionModel.find(filter).sort({ revision: -1 }).limit(CMS_VERSIONS_KEPT * 3).exec();
    return docs.map(toRevision);
  },

  async restore(revisionId: string, by: string) {
    const doc = await CmsSiteRevisionModel.findById(assertId(revisionId, 'revision')).exec();
    if (!doc) throw notFound('Revision');
    let data: unknown;
    try {
      data = JSON.parse(doc.data);
    } catch {
      throw badInput(`Revision ${doc.revision} could not be read`);
    }
    return save(String(doc.site_id), doc.section, data, by, doc.revision);
  },
};
