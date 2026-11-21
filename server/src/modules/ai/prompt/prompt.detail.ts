import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { auditActorName } from '@utils/audit-actor';
import { AiPromptModel } from './prompt.model';
import { aiPromptService } from './prompt.service';
import { listVersions } from './prompt.history';
import { qualityView, type StoredQuality } from './prompt.quality';
import { shareView } from './prompt.share';

/**
 * Everything the AI Library's detail view shows about one prompt, in one
 * query: the prompt itself (the same shape as the list), its archive state,
 * the stored quality review, the public link, the hit count and the history.
 */
export async function promptDetail(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  const [prompt, doc] = await Promise.all([aiPromptService.get(id), AiPromptModel.findById(id).lean()]);
  if (!prompt || !doc) return null;
  const [share, versions, archivedBy] = await Promise.all([
    shareView(doc),
    listVersions(id),
    doc.archived_by ? auditActorName(doc.archived_by) : Promise.resolve(null),
  ]);
  return {
    prompt,
    archived_at: doc.archived_at ? new Date(doc.archived_at).toISOString() : null,
    archived_by_name: archivedBy,
    quality: qualityView(doc.quality as StoredQuality | null, doc.content ?? ''),
    share,
    total_hits: doc.stats?.total_hits ?? 0,
    last_hit_at: doc.stats?.last_hit_at ? new Date(doc.stats.last_hit_at).toISOString() : null,
    versions,
  };
}

function notFound(): never {
  throw new GraphQLError('Prompt not found', { extensions: { code: 'NOT_FOUND' } });
}

/**
 * Archive an AI prompt: off the library's tabs, the feed and its public link,
 * kept in the Archived tab with its history. A code prompt is refused for the
 * same reason it cannot be deleted — a call site reads it on every request.
 */
export async function setArchived(id: string, archived: boolean, userId: string) {
  const doc = await AiPromptModel.findById(id);
  if (!doc) notFound();
  if (archived && doc.kind === 'CODE') {
    throw new GraphQLError('Code prompts power a shipped feature and cannot be archived', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  doc.archived_at = archived ? new Date() : null;
  doc.archived_by = archived ? userId : null;
  await doc.save();
  const detail = await promptDetail(id);
  if (!detail) notFound();
  return detail;
}
