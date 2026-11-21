import { randomBytes } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { estimateTokens } from '@services/ai/token-estimate';
import { auditActorName } from '@utils/audit-actor';
import { AiPromptModel } from './prompt.model';

/**
 * Public share links for AI Library prompts.
 *
 * A link is `/<token>` on the AI portal's public page. The token is 144 random
 * bits — the link is the whole gate, like a Google Docs "anyone with the link".
 * Turning sharing off keeps the token, so turning it back on restores the same
 * link people already have; "new link" mints another and the old one dies.
 *
 * A shared prompt stops resolving when it is switched off, archived, or made
 * inactive — the same rule the JSON feed follows.
 */

const TOKEN_BYTES = 18;
const newToken = () => randomBytes(TOKEN_BYTES).toString('base64url');

function notFound(): never {
  throw new GraphQLError('Prompt not found', { extensions: { code: 'NOT_FOUND' } });
}

interface ShareFields {
  share_token?: string | null;
  share_enabled?: boolean | null;
  shared_at?: Date | null;
  shared_by?: string | null;
}

export async function shareView(doc: ShareFields) {
  return {
    enabled: Boolean(doc.share_enabled && doc.share_token),
    token: doc.share_token ?? null,
    shared_at: doc.shared_at ? new Date(doc.shared_at).toISOString() : null,
    shared_by_name: doc.shared_by ? await auditActorName(doc.shared_by) : null,
  };
}

export async function enableShare(id: string, regenerate: boolean, userId: string) {
  const doc = await AiPromptModel.findById(id);
  if (!doc) notFound();
  if (doc.archived_at) {
    throw new GraphQLError('Restore this prompt from the archive before sharing it', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!doc.share_token || regenerate) doc.share_token = newToken();
  doc.share_enabled = true;
  doc.shared_at = new Date();
  doc.shared_by = userId;
  await doc.save();
  return shareView(doc);
}

export async function disableShare(id: string) {
  const doc = await AiPromptModel.findById(id);
  if (!doc) notFound();
  doc.share_enabled = false;
  await doc.save();
  return shareView(doc);
}

/** Tokens are base64url of a fixed length; anything else is not worth a query. */
const TOKEN_SHAPE = /^[\w-]{20,40}$/;

const loadShared = (token: string) =>
  AiPromptModel.findOne({ share_token: token, share_enabled: true, archived_at: null, is_active: true }).lean();

type SharedDoc = NonNullable<Awaited<ReturnType<typeof loadShared>>>;

/** What a stranger with the link may read — never who wrote it or where it runs. */
export async function findSharedPrompt(token: string) {
  if (!TOKEN_SHAPE.test(token)) return null;
  const doc = await loadShared(token);
  if (!doc) return null;
  const content = doc.content ?? '';
  // The id is for recording events against; only `view` is ever sent.
  return { id: String(doc._id), view: publicView(doc, content) };
}

function publicView(doc: SharedDoc, content: string) {
  return {
    name: doc.name,
    description: doc.description ?? '',
    category: doc.category ?? 'General',
    target_model: doc.target_model ?? '',
    content,
    variables: (doc.variables ?? []).map((v) => ({
      name: v.name,
      label: v.label || v.name,
      description: v.description ?? '',
      required: Boolean(v.required),
      example: v.example ?? '',
    })),
    token_count: estimateTokens(content),
    updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
  };
}
