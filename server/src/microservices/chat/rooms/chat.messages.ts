import { Types } from 'mongoose';
import { displayFrom, userDisplayMap, type UserDisplay } from '@modules/access/user/user.display';
import { PodMessageModel } from './chat.model';
import { shapeMessage, type MentionUser, type ReplySnippet, type StoredMessage } from './chat.shape';

interface QuotedRow {
  _id: unknown;
  user_id: unknown;
  type?: string | null;
  text?: string | null;
  deleted?: boolean | null;
}

/**
 * The quote a reply shows. A removed original — or one by somebody the reader
 * has blocked, or who blocked them — reads as deleted, with no words, so a
 * reply never resurfaces a line its reader may not see.
 */
export function replySnippet(
  row: QuotedRow | undefined,
  display: Map<string, UserDisplay>,
  hidden: ReadonlySet<string> = new Set()
): ReplySnippet | null {
  if (!row) return null;
  const author = String(row.user_id);
  const gone = !!row.deleted || hidden.has(author);
  return {
    id: String(row._id),
    user_id: author,
    user_name: displayFrom(display, author).name,
    text: gone ? '' : row.text || '',
    type: row.type || 'TEXT',
    deleted: gone,
  };
}

const mentionUser = (display: Map<string, UserDisplay>, id: string): MentionUser => {
  const d = displayFrom(display, id);
  return { user_id: id, full_name: d.name, profile_photo: d.photo || null };
};

/**
 * Shapes a page (or one) of stored lines for GraphQL and the socket, with
 * every quote and mention resolved in batches: ONE read for all the quoted
 * originals, ONE user read for every author, mention and quoted author. A
 * history page of 30 replies therefore costs two queries, not sixty.
 *
 * `hidden` is the reader's blocked peers (both directions), for the quote rule
 * above; the socket broadcast has no single reader and passes none.
 */
export async function shapeMessages(docs: ReadonlyArray<StoredMessage>, hidden?: ReadonlySet<string>) {
  const replyIds = [
    ...new Set(docs.map((d) => d.reply_to_id).filter((id): id is string => !!id && Types.ObjectId.isValid(id))),
  ];
  const originals = replyIds.length
    ? await PodMessageModel.find({ _id: { $in: replyIds } })
        .select('user_id type text deleted')
        .lean<QuotedRow[]>()
    : [];
  const byId = new Map(originals.map((row) => [String(row._id), row]));
  const display = await userDisplayMap([
    ...docs.map((d) => String(d.user_id)),
    ...docs.flatMap((d) => (d.mentions || []).map(String)),
    ...originals.map((row) => String(row.user_id)),
  ]);
  return docs.map((d) =>
    shapeMessage(d, displayFrom(display, String(d.user_id)), {
      replyTo: d.reply_to_id ? replySnippet(byId.get(String(d.reply_to_id)), display, hidden) : null,
      mentionUsers: (d.mentions || []).map((id) => mentionUser(display, String(id))),
    })
  );
}

/** One stored line shaped the same way — the send, reaction and delete broadcasts. */
export async function shapeOne(doc: StoredMessage) {
  const [shaped] = await shapeMessages([doc]);
  return shaped;
}
