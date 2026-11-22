import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { estimateTokens } from '@services/ai/token-estimate';
import { AiPromptVersionModel } from './prompt.version.model';
import { aiPromptService } from './prompt.service';

/** How far back the detail view lists; older versions stay in the collection. */
export const HISTORY_LIMIT = 50;

const iso = (value: unknown): string | null => (value ? new Date(value as string | Date).toISOString() : null);

export async function listVersions(promptId: string) {
  if (!Types.ObjectId.isValid(promptId)) return [];
  const rows = await AiPromptVersionModel.find({ prompt_id: new Types.ObjectId(promptId) })
    .sort({ version: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  return rows.map((row) => ({
    version: row.version,
    change: row.change,
    changed_fields: row.changed_fields ?? [],
    name: row.name ?? '',
    description: row.description ?? '',
    content: row.content ?? '',
    category: row.category ?? '',
    target_model: row.target_model ?? '',
    is_active: row.is_active !== false,
    token_count: estimateTokens(row.content ?? ''),
    edited_by_name: row.edited_by_name ?? null,
    created_at: iso(row.created_at),
  }));
}

/**
 * Put an earlier version back. It goes through the ordinary update, so a code
 * prompt keeps its catalogue-owned fields and its required placeholders, and
 * the restore is itself a new version — history only ever grows.
 */
export async function restoreVersion(promptId: string, version: number) {
  if (!Types.ObjectId.isValid(promptId)) {
    throw new GraphQLError('Prompt not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const row = await AiPromptVersionModel.findOne({ prompt_id: new Types.ObjectId(promptId), version }).lean();
  if (!row) throw new GraphQLError(`Version ${version} not found`, { extensions: { code: 'NOT_FOUND' } });
  return aiPromptService.update(promptId, {
    name: row.name,
    description: row.description,
    content: row.content,
    category: row.category,
    target_model: row.target_model,
    is_active: row.is_active,
  });
}
