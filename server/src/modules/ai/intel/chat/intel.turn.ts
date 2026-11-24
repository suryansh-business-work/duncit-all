import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { inspectUserInput, sanitizeAnswer } from '@modules/ai/askDuncit/guard/askDuncit.guard';
import type { IntelActor } from '../access/intel.access';
import { writeAudit } from '../audit/intelAudit.service';
import type { IntelHttp } from '../connectors/mcp/mcp.builtin';
import { INTEL_LIMITS } from '../intel.constants';
import { intelSettingsService } from '../settings/intelSettings.service';
import { buildTurnContext, pickModel } from './intel.context';
import { resolveAttachments } from './intel.attachments';
import { allowMinute, underDailyCap } from './intel.limits';
import { runLoop, usedCitations } from './intel.loop';
import { emitIntel, intelTurns } from './intel.stream';
import { generateTitle } from './intel.title';
import { IntelConversationModel, IntelMessageModel, type IIntelConversation } from './intelChat.models';
import { intelConversations, sanitizeEnvironment, sanitizeSources } from './intelConversation.service';

/**
 * Starting a turn: checks (length, injection guard, rate limits, access),
 * persistence (new message, edit or regenerate), then the model loop in the
 * background. Returns at once with the ids; the answer streams over the socket.
 */

export interface SendInput {
  conversation_id?: string | null;
  message?: string | null;
  model?: string | null;
  environment?: string | null;
  sources?: string[] | null;
  /** Edit this earlier user message and answer again from there. */
  edit_message_id?: string | null;
  /** Answer the last question again. */
  regenerate?: boolean | null;
  /** Images or PDFs from the asker's Media library, for a new message. */
  attachment_ids?: string[] | null;
}

const bad = (message: string, code = 'BAD_USER_INPUT') => new GraphQLError(message, { extensions: { code } });
const oid = (id: string) => new Types.ObjectId(id);

async function checks(actor: IntelActor, text: string) {
  const settings = await intelSettingsService.get();
  if (text.length > INTEL_LIMITS.maxMessageChars) throw bad(`Messages can be at most ${INTEL_LIMITS.maxMessageChars} characters.`);
  const verdict = inspectUserInput(text);
  if (verdict.blocked && settings.security.block_injection) {
    await writeAudit({ type: 'VIOLATION', action: 'chat.injection_blocked', status: 'DENIED', userId: actor.user.id, level: actor.level, detail: text.slice(0, 1000) });
    throw bad('This message looks like an attempt to override the assistant’s rules, so it was not sent.');
  }
  if (!allowMinute(actor.user.id, settings.security.messages_per_minute)) throw bad('You are sending messages too quickly. Wait a moment and try again.', 'RATE_LIMITED');
  if (!(await underDailyCap(actor.user.id, intelSettingsService.policyFor(settings, actor.level).messages_per_day))) throw bad('You have reached today’s message limit.', 'RATE_LIMITED');
  return { settings, text: verdict.text };
}

async function resolveConversation(actor: IntelActor, input: SendInput, settings: Awaited<ReturnType<typeof intelSettingsService.get>>): Promise<IIntelConversation> {
  if (!input.conversation_id) {
    return intelConversations.create(actor.user.id, {
      model: pickModel(input.model ?? '', settings),
      environment: sanitizeEnvironment(input.environment, settings.general.default_environment),
      sources: sanitizeSources(input.sources),
    });
  }
  const current = await intelConversations.own(actor.user.id, input.conversation_id);
  await intelConversations.update(actor.user.id, input.conversation_id, { model: input.model ? pickModel(input.model, settings) : null, environment: input.environment, sources: input.sources });
  return (await IntelConversationModel.findById(current._id).lean()) ?? current;
}

/** Edit / regenerate: hide everything after the point the conversation restarts from. */
async function rewind(conversation: IIntelConversation, ownerId: string, input: SendInput, text: string): Promise<{ userMessageId: string; question: string }> {
  const owner = oid(ownerId);
  const live = { conversation_id: conversation._id, owner_id: owner, superseded: false };
  if (input.edit_message_id) {
    const msg = await IntelMessageModel.findOne({ ...live, _id: Types.ObjectId.isValid(input.edit_message_id) ? input.edit_message_id : null, role: 'USER' }).lean();
    if (!msg) throw bad('That message cannot be edited.', 'NOT_FOUND');
    await IntelMessageModel.updateOne({ _id: msg._id }, { $set: { content: text }, $push: { edit_history: { content: msg.content, edited_at: new Date() } } });
    await IntelMessageModel.updateMany({ ...live, created_at: { $gt: msg.created_at } }, { $set: { superseded: true } });
    return { userMessageId: String(msg._id), question: text };
  }
  const lastUser = await IntelMessageModel.findOne({ ...live, role: 'USER' }).sort({ created_at: -1 }).lean();
  if (!lastUser) throw bad('There is no question to answer again.', 'NOT_FOUND');
  await IntelMessageModel.updateMany({ ...live, created_at: { $gt: lastUser.created_at } }, { $set: { superseded: true } });
  return { userMessageId: String(lastUser._id), question: lastUser.content };
}

export async function startTurn(actor: IntelActor, input: SendInput, http?: IntelHttp) {
  const raw = String(input.message ?? '').trim();
  if (!raw && !input.regenerate) throw bad('Type a message first.');
  const { settings, text } = await checks(actor, raw || 'regenerate');
  if (input.edit_message_id && !raw) throw bad('Type the edited message first.');
  const attachments = input.edit_message_id || input.regenerate ? [] : await resolveAttachments(actor, input.attachment_ids);
  const conversation = await resolveConversation(actor, input, settings);
  const firstTurn = conversation.message_count === 0;
  let userMessageId: string;
  let question = text;
  if (input.edit_message_id || input.regenerate) {
    ({ userMessageId, question } = await rewind(conversation, actor.user.id, input, text));
  } else {
    userMessageId = String((await IntelMessageModel.create({ conversation_id: conversation._id, owner_id: oid(actor.user.id), role: 'USER', content: text, attachments }))._id);
  }
  const assistant = await IntelMessageModel.create({ conversation_id: conversation._id, owner_id: oid(actor.user.id), role: 'ASSISTANT', status: 'STREAMING', model: conversation.model });
  const messageId = String(assistant._id);
  await IntelConversationModel.updateOne({ _id: conversation._id }, { $set: { last_message_at: new Date() }, $inc: { message_count: input.regenerate || input.edit_message_id ? 1 : 2 } });

  const ctx = await buildTurnContext(actor, conversation, messageId, http);
  const controller = intelTurns.start(messageId, actor.user.id);
  answerInBackground({ ctx, userMessageId, question, signal: controller.signal, titleIt: firstTurn && !conversation.title_generated })
    .catch(async (error) => {
      logs.server.error('intel', 'turn', { error, messageId });
      await IntelMessageModel.updateOne({ _id: assistant._id }, { $set: { status: 'FAILED', error_code: 'INTERNAL', error_message: 'Something went wrong while answering. Try again.' } });
    })
    .finally(() => {
      intelTurns.finish(messageId);
      emitIntel(actor.user.id, 'done', { message_id: messageId, conversation_id: String(conversation._id) });
    });
  return { conversation_id: String(conversation._id), user_message_id: userMessageId, assistant_message_id: messageId };
}

function finalStatus(aborted: boolean, errorCode: string | null, answer: string): 'STOPPED' | 'FAILED' | 'COMPLETE' {
  if (aborted) return 'STOPPED';
  if (errorCode && !answer) return 'FAILED';
  return 'COMPLETE';
}

interface BackgroundTurn {
  ctx: Awaited<ReturnType<typeof buildTurnContext>>;
  userMessageId: string;
  question: string;
  signal: AbortSignal;
  titleIt: boolean;
}

async function answerInBackground({ ctx, userMessageId, question, signal, titleIt }: BackgroundTurn): Promise<void> {
  const { actor, conversation } = ctx;
  const messageId = oid(ctx.messageId);
  if (ctx.environments.length === 0) {
    await IntelMessageModel.updateOne({ _id: messageId }, { $set: { status: 'FAILED', error_code: 'RESTRICTED', error_message: 'Your access level cannot read the environment chosen for this conversation. Switch to Staging or ask an Admin.' } });
    return;
  }
  const out = await runLoop(ctx, userMessageId, question, signal);
  const answer = sanitizeAnswer(out.content).text;
  const status = finalStatus(out.aborted, out.errorCode, answer);
  const error = out.aborted ? { code: '', message: '' } : { code: out.errorCode ?? '', message: out.errorMessage ?? '' };
  await IntelMessageModel.updateOne(
    { _id: messageId },
    { $set: { content: answer, status, citations: usedCitations(answer, out.citations), tool_calls: out.toolCalls, approval_ids: out.approvalIds, model: out.model, prompt_tokens: out.promptTokens, completion_tokens: out.completionTokens, error_code: error.code, error_message: error.message } }
  );
  const tools = out.toolCalls.map((t) => `${t.name}:${t.status}`).join(', ');
  await writeAudit({ type: 'CHAT', action: 'chat.turn', status: status === 'FAILED' ? 'FAILED' : 'OK', userId: actor.user.id, level: actor.level, environment: conversation.environment, target: ctx.conversationId, detail: `${tools} · ${out.promptTokens + out.completionTokens} tokens` });
  if (titleIt) await generateTitle(actor.user.id, ctx.conversationId, question, ctx.settings);
}
