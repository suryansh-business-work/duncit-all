import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { claudeDefaultModel } from '@services/anthropic/anthropic.client';
import { openaiChat } from '@services/openai/openai.client';
import { recordPlanCost } from '../agents/agent.cost';
import { userActor, withRun } from '../runs/marketingRun.service';
import { SocialAccountModel, SocialCommentModel, SocialPostModel } from './social.model';
import { REPLY_LIMIT } from './social.replies';

/**
 * "Suggest reply" in the Inbox: Claude reads the comment, the post it was left
 * on and the AI's verdict, and drafts an answer a person edits before sending.
 * Nothing here sends — the draft only goes out through replyToComment, from a
 * person's press. Both turns and the model come from the AI Library; every
 * suggestion is a MarketingRun (INBOX_REPLY) with its tokens and cost.
 */
const MAX_TOKENS = 800;

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

export async function suggestReply(id: string, user: { id: string; email?: string | null }): Promise<{ text: string; run_id: string }> {
  const comment = isValidObjectId(id) ? await SocialCommentModel.findById(id).lean() : null;
  if (!comment) fail('NOT_FOUND', 'Comment not found');
  const [post, account, actor] = await Promise.all([
    SocialPostModel.findById(comment.post_id).select('text').lean(),
    SocialAccountModel.findById(comment.account_id).select('name').lean(),
    userActor(user),
  ]);
  const limit = REPLY_LIMIT[comment.platform];
  const who = comment.author_name || comment.author_handle || 'a comment';
  let runId = '';
  try {
    const text = await withRun(
      {
        workflow: 'INBOX_REPLY',
        name: `Suggest a reply to ${who} on ${comment.platform}`,
        actor,
        links: { account_id: comment.account_id, post_id: comment.post_id },
      },
      async (run) => {
        runId = run.id;
        return run.step(
          'draft',
          'Draft a reply with Claude',
          async () => {
            const [system, turn] = await Promise.all([
              resolvePrompt('social.inbox.reply'),
              resolvePrompt('social.inbox.reply.user', {
                platform: comment.platform,
                account: account?.name ?? '',
                post: (post?.text ?? '').slice(0, 1000),
                author: comment.author_name || comment.author_handle || '',
                comment: comment.text ?? '',
                verdict: [comment.ai_sentiment, comment.ai_severity, comment.ai_reason].filter(Boolean).join(' · '),
                limit: String(limit),
              }),
            ]);
            const model = system.model || (await claudeDefaultModel());
            const res = await openaiChat({
              task: 'marketing.inbox_reply',
              model,
              json: true,
              max_tokens: MAX_TOKENS,
              messages: [
                { role: 'system', content: system.content },
                { role: 'user', content: turn.content },
              ],
              detail: `comment:${id}`,
              user_id: user.id,
            });
            if (!res.ok) throw new Error(res.message);
            await recordPlanCost(run, res.model, res.usage);
            const draft = parseDraft(res.content, limit);
            if (!draft) throw new Error('The AI answered in a form that could not be read — try again.');
            return draft;
          },
          { tool: 'claude.inbox_reply', input_summary: (comment.text ?? '').slice(0, 200), summarize: (draft) => draft.slice(0, 200) }
        );
      }
    );
    return { text, run_id: runId };
  } catch (error) {
    fail('AI_UNAVAILABLE', error instanceof Error ? error.message : String(error), runId);
  }
}
