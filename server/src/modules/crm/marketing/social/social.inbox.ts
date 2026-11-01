import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { allUsersExist } from '../userNames';
import { SocialCommentModel, type SocialCommentDoc } from './social.model';
import { commentContext, pubComment } from './social.service';
import type { SocialInboxStatus, SocialInboxView } from './social.types';

/**
 * Marketing → Social → Inbox: every comment read from every connected
 * account, as one queue somebody works — triaged by the AI's verdict (written
 * by social.ai.ts), assigned to a person, answered where the network allows
 * (social.replies.ts) or closed. A comment's `status` is the Inbox's word for
 * where it stands; `review_status` is kept in step for the Monitoring tab.
 */
const INBOX_TABLE: TableEntityConfig = {
  searchFields: ['text', 'author_name', 'author_handle'],
  sortFields: { published_at: 'published_at', last_activity_at: 'last_activity_at', likes: 'likes' },
  filterFields: {
    account_id: { type: 'enum' },
    platform: { type: 'enum' },
    status: { type: 'enum' },
    ai_status: { type: 'enum' },
    ai_sentiment: { type: 'enum' },
    ai_severity: { type: 'enum' },
    assigned_user_id: { type: 'string' },
    created_at: { type: 'date' },
    published_at: { type: 'date' },
  },
  defaultSort: { published_at: -1 },
};

const OPEN: SocialInboxStatus = 'OPEN';

/** The base filter each summary card opens the queue on; `userId` is the person asking, for "Mine". */
export function viewFilter(view: SocialInboxView | null | undefined, userId: string): Record<string, unknown> {
  switch (view ?? 'ALL') {
    case 'OPEN':
      return { status: OPEN };
    case 'FLAGGED':
      return { status: OPEN, ai_status: 'FLAGGED' };
    case 'UNASSIGNED':
      return { status: OPEN, assigned_user_id: null };
    case 'MINE':
      return { status: OPEN, assigned_user_id: userId };
    default:
      return {};
  }
}

function notFound(): never {
  throw new GraphQLError('Comment not found', { extensions: { code: 'NOT_FOUND' } });
}

/** One comment as the Inbox shows it, assignee and replies included. */
export async function inboxComment(id: string) {
  const doc = isValidObjectId(id) ? await SocialCommentModel.findById(id).lean() : null;
  if (!doc) notFound();
  const { names, posts, people } = await commentContext([doc]);
  return pubComment(doc, names, posts, people);
}

/** Who did what, and when, on a comment that must exist. */
async function update(id: string, set: Record<string, unknown>) {
  const updated = isValidObjectId(id)
    ? await SocialCommentModel.updateOne({ _id: id }, { $set: { ...set, last_activity_at: new Date() } })
    : null;
  if (!updated || updated.matchedCount === 0) notFound();
  return inboxComment(id);
}

export const socialInbox = {
  async table(input: TableQueryInput | null | undefined, view: SocialInboxView | null | undefined, userId: string) {
    const { docs, total, page, page_size } = await runTableQuery<SocialCommentDoc>(SocialCommentModel, viewFilter(view, userId), input, INBOX_TABLE);
    const { names, posts, people } = await commentContext(docs);
    return { rows: docs.map((doc) => pubComment(doc, names, posts, people)), total, page, page_size };
  },

  /** What is waiting: open comments, the open ones the AI flagged, nobody's, and the asker's own. */
  async summary(userId: string) {
    const [open, flagged, unassigned, mine] = await Promise.all(
      (['OPEN', 'FLAGGED', 'UNASSIGNED', 'MINE'] as const).map((view) => SocialCommentModel.countDocuments(viewFilter(view, userId)))
    );
    return { open, flagged, unassigned, mine };
  },

  /** Hand the comment to a living user, or to nobody. */
  async assign(id: string, userId: string | null | undefined, actorId: string) {
    const assignee = userId?.trim() || null;
    if (assignee && !(await allUsersExist([assignee]))) {
      throw new GraphQLError('The assignee is not a known user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const comment = await update(id, { assigned_user_id: assignee });
    logs.server.info('social-inbox', 'assign', { comment_id: id, assigned_user_id: assignee, by: actorId });
    return comment;
  },

  /** Where the comment stands; anything but OPEN counts as reviewed on the Monitoring tab. */
  async setStatus(id: string, status: SocialInboxStatus, actorId: string) {
    const open = status === OPEN;
    return update(id, {
      status,
      review_status: open ? 'OPEN' : 'REVIEWED',
      reviewed_by: open ? null : actorId,
      reviewed_at: open ? null : new Date(),
    });
  },
};

/**
 * Fill the Inbox fields on comments stored before it existed: a reviewed
 * comment is DONE, the rest OPEN, and the last activity is when it was left.
 * Runs at boot; once every comment has a status it finds nothing to do.
 */
export async function migrateSocialInbox(): Promise<number> {
  const result = await SocialCommentModel.updateMany({ status: { $exists: false } }, [
    {
      $set: {
        status: { $cond: [{ $eq: ['$review_status', 'REVIEWED'] }, 'DONE', OPEN] },
        assigned_user_id: { $ifNull: ['$assigned_user_id', null] },
        replies: { $ifNull: ['$replies', []] },
        last_activity_at: { $ifNull: ['$last_activity_at', '$published_at'] },
      },
    },
  ]);
  if (result.modifiedCount > 0) logs.server.info('social-inbox', 'migrateSocialInbox', { comments: result.modifiedCount });
  return result.modifiedCount;
}
