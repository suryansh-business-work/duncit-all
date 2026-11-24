import { Types, type PipelineStage } from 'mongoose';
import type { TableQueryInput } from '@utils/table-query';
import { escapeRegExp } from '@utils/regex';
import { ownerNamesOf } from '../userNames';
import { SocialConversationModel } from './social.conversation.model';
import { viewFilter } from './social.inbox';
import { SocialAccountModel, SocialCommentModel } from './social.model';
import type { SocialInboxView } from './social.types';

/**
 * The Inbox's "All" tab: comments, Threads replies and DM conversations as one
 * queue, newest first, on the same view (open, flagged, unassigned, mine).
 * One aggregation — the comments with the conversations unioned in — so the
 * page and the total are the database's, not stitched together here.
 */
export type SocialInboxItemKind = 'COMMENT' | 'THREADS_REPLY' | 'DM';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** An aggregation does not cast like a query does: the assignee id must already be an ObjectId. */
function castView(filter: Record<string, unknown>): Record<string, unknown> {
  const assignee = filter.assigned_user_id;
  if (typeof assignee === 'string') return { ...filter, assigned_user_id: Types.ObjectId.isValid(assignee) ? new Types.ObjectId(assignee) : assignee };
  return filter;
}

const COMMENT_SHAPE = {
  kind: { $cond: [{ $eq: ['$platform', 'THREADS'] }, 'THREADS_REPLY', 'COMMENT'] },
  platform: 1,
  account_id: 1,
  author: { $cond: [{ $gt: ['$author_name', ''] }, '$author_name', { $ifNull: ['$author_handle', ''] }] },
  text: { $ifNull: ['$text', ''] },
  status: 1,
  ai_sentiment: 1,
  ai_severity: 1,
  assigned_user_id: 1,
  at: '$published_at',
  unread_count: { $literal: 0 },
};

const CONVERSATION_SHAPE = {
  kind: { $literal: 'DM' },
  platform: 1,
  account_id: 1,
  author: { $cond: [{ $gt: ['$participant.name', ''] }, '$participant.name', { $ifNull: ['$participant.username', ''] }] },
  text: { $ifNull: ['$last_message_text', ''] },
  status: 1,
  ai_sentiment: 1,
  ai_severity: 1,
  assigned_user_id: 1,
  at: '$last_message_at',
  unread_count: { $ifNull: ['$unread_count', 0] },
};

interface ItemRow {
  _id: Types.ObjectId;
  kind: SocialInboxItemKind;
  platform: string;
  account_id: string;
  author: string;
  text: string;
  status: string;
  ai_sentiment: string | null;
  ai_severity: string | null;
  assigned_user_id: Types.ObjectId | null;
  at: Date | null;
  unread_count: number;
}

export async function inboxItemsTable(input: TableQueryInput | null | undefined, view: SocialInboxView | null | undefined, userId: string) {
  const page = Math.max(1, Math.floor(Number(input?.page) || 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(input?.page_size) || DEFAULT_PAGE_SIZE)));
  const match = castView(viewFilter(view, userId));
  const search = (input?.search ?? '').trim();
  const searchStage: PipelineStage[] = search ? [{ $match: { $or: [{ text: { $regex: escapeRegExp(search), $options: 'i' } }, { author: { $regex: escapeRegExp(search), $options: 'i' } }] } }] : [];
  const [result] = await SocialCommentModel.aggregate<{ rows: ItemRow[]; total: { n: number }[] }>([
    { $match: match },
    { $project: COMMENT_SHAPE },
    { $unionWith: { coll: SocialConversationModel.collection.collectionName, pipeline: [{ $match: match }, { $project: CONVERSATION_SHAPE }] } },
    ...searchStage,
    { $sort: { at: -1, _id: -1 } },
    { $facet: { rows: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }], total: [{ $count: 'n' }] } },
  ]);
  const rows = result?.rows ?? [];
  const [accounts, people] = await Promise.all([
    SocialAccountModel.find({ _id: { $in: [...new Set(rows.map((row) => row.account_id))] } }).select('name handle').lean(),
    ownerNamesOf(rows.map((row) => ({ owner_user_id: row.assigned_user_id }))),
  ]);
  const names = new Map(accounts.map((account) => [String(account._id), account.name || account.handle || '']));
  return {
    rows: rows.map((row) => ({
      id: String(row._id),
      kind: row.kind,
      platform: row.platform,
      account_id: row.account_id,
      account_name: names.get(row.account_id) ?? '',
      author: row.author ?? '',
      text: row.text ?? '',
      status: row.status,
      ai_sentiment: row.ai_sentiment ?? null,
      ai_severity: row.ai_severity ?? null,
      assigned_name: row.assigned_user_id ? people.get(String(row.assigned_user_id)) ?? null : null,
      at: row.at instanceof Date ? row.at.toISOString() : null,
      unread_count: row.unread_count ?? 0,
    })),
    total: result?.total[0]?.n ?? 0,
    page,
    page_size: pageSize,
  };
}
