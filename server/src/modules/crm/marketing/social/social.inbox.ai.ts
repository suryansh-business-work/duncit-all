import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { claudeDefaultModel, isClaudeModel } from '@services/anthropic/anthropic.client';
import { openaiChat } from '@services/openai/openai.client';
import { recordPlanCost } from '../agents/agent.cost';
import { userActor, withRun, type RunLinks } from '../runs/marketingRun.service';
import { SocialConversationModel, SocialMessageModel, type SocialConversationDoc } from './social.conversation.model';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from './social.model';
import { REPLY_LIMIT } from './social.replies';
import { loadSocialSettings } from './social.settings';
import { DM_LIMIT } from './social.window';

/**
 * "Suggest reply" in the Inbox, for a comment and for a DM: the AI reads what
 * the person wrote (and the post, or the latest messages of the conversation)
 * and drafts an answer a person edits before sending. Nothing here sends.
 * Both turns come from the AI Library; Social Settings' reply guidelines are
 * added to the system turn. The model is the one the AI Library pins, else
 * Claude when an Anthropic key is set, else the OpenAI default — so drafts
 * keep working with whichever key the team has. Every suggestion is a
 * MarketingRun (INBOX_REPLY) with its tokens and cost.
 */
const MAX_TOKENS = 800;
/** How many of a conversation's latest messages the draft reads. */
const DM_CONTEXT_MESSAGES = 12;

function fail(code: string, message: string, runId = ''): never {
  throw new GraphQLError(message, { extensions: { code, ...(runId ? { run_id: runId } : {}) } });
}

/** The draft from `{"reply": "..."}`, cut to what the network takes; '' when the answer cannot be read. */
export function parseDraft(content: string, limit: number): string {
  try {
    const parsed: unknown = JSON.parse(content);
    const reply = typeof parsed === 'object' && parsed !== null ? (parsed as { reply?: unknown }).reply : undefined;
    return typeof reply === 'string' ? reply.trim().slice(0, limit) : '';
  } catch {
    return '';
  }
}

/**
 * The model a draft runs on. A model the AI Library pins wins, unless it is a
 * Claude model and no Anthropic key is set — then, like an unpinned prompt
 * without the key, the draft goes to the OpenAI default ('') rather than
 * failing. With the key, an unpinned prompt runs on Claude's default.
 */
export async function draftModel(pinned: string): Promise<string> {
  if (pinned && !isClaudeModel(pinned)) return pinned;
  const anthropicKey = (await getRuntimeEnvValue('ANTHROPIC_API_KEY')).trim();
  if (!anthropicKey) return '';
  return pinned || claudeDefaultModel();
}

/** The system turn with the team's own guidelines, when Settings has any. */
export const withGuidelines = (system: string, guidelines: string): string =>
  guidelines ? `${system}\n\nThe team's own guidelines for replies — follow them:\n${guidelines}` : system;

interface DraftRequest {
  name: string;
  links: RunLinks;
  limit: number;
  detail: string;
  summary: string;
  variables: Record<string, string>;
}

async function draft(request: DraftRequest, user: { id: string; email?: string | null }): Promise<{ text: string; run_id: string }> {
  const [actor, settings] = await Promise.all([userActor(user), loadSocialSettings()]);
  let runId = '';
  try {
    const text = await withRun({ workflow: 'INBOX_REPLY', name: request.name, actor, links: request.links }, async (run) => {
      runId = run.id;
      return run.step(
        'draft',
        'Draft a reply with AI',
        async () => {
          const [system, turn] = await Promise.all([
            resolvePrompt('social.inbox.reply'),
            resolvePrompt('social.inbox.reply.user', { ...request.variables, limit: String(request.limit) }),
          ]);
          const res = await openaiChat({
            task: 'marketing.inbox_reply',
            model: await draftModel(system.model),
            json: true,
            max_tokens: MAX_TOKENS,
            messages: [
              { role: 'system', content: withGuidelines(system.content, settings.ai_reply_guidelines) },
              { role: 'user', content: turn.content },
            ],
            detail: request.detail,
            user_id: user.id,
          });
          if (!res.ok) throw new Error(res.message);
          await recordPlanCost(run, res.model, res.usage);
          const reply = parseDraft(res.content, request.limit);
          if (!reply) throw new Error('The AI answered in a form that could not be read — try again.');
          return reply;
        },
        { tool: 'claude.inbox_reply', input_summary: request.summary.slice(0, 200), summarize: (reply) => reply.slice(0, 200) }
      );
    });
    return { text, run_id: runId };
  } catch (error) {
    fail('AI_UNAVAILABLE', error instanceof Error ? error.message : String(error), runId);
  }
}

export async function suggestReply(id: string, user: { id: string; email?: string | null }): Promise<{ text: string; run_id: string }> {
  const comment = isValidObjectId(id) ? await SocialCommentModel.findById(id).lean() : null;
  if (!comment) fail('NOT_FOUND', 'Comment not found');
  const [post, account] = await Promise.all([
    SocialPostModel.findById(comment.post_id).select('text').lean(),
    SocialAccountModel.findById(comment.account_id).select('name').lean(),
  ]);
  const who = comment.author_name || comment.author_handle || 'a comment';
  return draft(
    {
      name: `Suggest a reply to ${who} on ${comment.platform}`,
      links: { account_id: comment.account_id, post_id: comment.post_id },
      limit: REPLY_LIMIT[comment.platform],
      detail: `comment:${id}`,
      summary: comment.text ?? '',
      variables: {
        platform: comment.platform,
        account: account?.name ?? '',
        post: (post?.text ?? '').slice(0, 1000),
        author: comment.author_name || comment.author_handle || '',
        comment: comment.text ?? '',
        verdict: [comment.ai_sentiment, comment.ai_severity, comment.ai_reason].filter(Boolean).join(' · '),
      },
    },
    user
  );
}

/** A draft for a direct message: the conversation's latest messages are what it answers. */
export async function suggestDirectMessage(id: string, user: { id: string; email?: string | null }): Promise<{ text: string; run_id: string }> {
  const conversation = isValidObjectId(id) ? await SocialConversationModel.findById(id).lean<SocialConversationDoc>() : null;
  if (!conversation) fail('NOT_FOUND', 'Conversation not found');
  const [account, latest] = await Promise.all([
    SocialAccountModel.findById(conversation.account_id).select('name').lean(),
    SocialMessageModel.find({ conversation_id: id }).sort({ sent_at: -1 }).limit(DM_CONTEXT_MESSAGES).select('direction text').lean(),
  ]);
  const who = conversation.participant.name || conversation.participant.username || 'a person';
  const transcript = [...latest]
    .reverse()
    .map((message) => `${message.direction === 'IN' ? who : 'Us'}: ${message.text ?? ''}`)
    .join('\n');
  return draft(
    {
      name: `Suggest a message to ${who} on ${conversation.platform}`,
      links: { account_id: conversation.account_id },
      limit: DM_LIMIT[conversation.platform] ?? 1000,
      detail: `conversation:${id}`,
      summary: conversation.last_message_text ?? '',
      variables: {
        platform: `${conversation.platform} direct message`,
        account: account?.name ?? '',
        post: '',
        author: who,
        comment: transcript.slice(-3000),
        verdict: [conversation.ai_sentiment, conversation.ai_severity, conversation.ai_reason].filter(Boolean).join(' · '),
      },
    },
    user
  );
}
