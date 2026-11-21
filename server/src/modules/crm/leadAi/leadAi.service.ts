import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat, type OpenAiMessage } from '@services/openai/openai.client';
import { openAiGraphQLError, openAiInvalidJsonError } from '@services/openai/openai.errors';
import { estimateTokens } from '@services/ai/token-estimate';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import type { CrmLeadEntityType } from '@modules/crm/crm/crm.constants';
import { buildLeadAiContext, LEAD_KIND_LABEL, type LeadAiContext, type LeadAiSource } from './leadAi.context';
import { describeAction, parseLeadAiActions } from './leadAi.actions';
import { LEAD_AI_THREAD_CAP, LeadAiThreadModel, type LeadAiActionStatus } from './leadAi.model';

/** Past messages replayed to the model with each question. */
export const HISTORY_TURNS = 20;
export const MAX_QUESTION_CHARS = 4000;

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : null);

/** A proposal as stored on a thread message. */
interface StoredAction {
  type: string;
  status?: string | null;
  to?: string | null;
  subject?: string | null;
  body_html?: string | null;
  reminder_id?: string | null;
  title?: string | null;
  due_at?: Date | null;
  notes?: string | null;
  reminder_status?: string | null;
  result_message?: string | null;
}

/** A thread message as stored. */
interface StoredMessage {
  _id: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  actions?: StoredAction[];
  created_at?: Date | null;
}

type StoredThread = { messages?: StoredMessage[] } | null;

const pubAction = (a: StoredAction) => ({
  type: a.type,
  status: a.status ?? 'PROPOSED',
  to: a.to || null,
  subject: a.subject || null,
  body_html: a.body_html || null,
  reminder_id: a.reminder_id ?? null,
  title: a.title || null,
  due_at: iso(a.due_at),
  notes: a.notes || null,
  reminder_status: a.reminder_status ?? null,
  result_message: a.result_message || null,
});

const pubMessage = (m: StoredMessage) => ({
  id: String(m._id),
  role: m.role,
  content: m.content,
  actions: (m.actions ?? []).map(pubAction),
  created_at: iso(m.created_at),
});

/** The panel's "what the assistant knows" header. */
function contextInfo(sources: LeadAiSource[]) {
  return {
    sources,
    total_tokens: sources.reduce((n, s) => n + s.tokens, 0),
    total_chars: sources.reduce((n, s) => n + s.chars, 0),
    built_at: new Date().toISOString(),
  };
}

/** The replayed history, with each past proposal's outcome spelled out. */
function historyOf(messages: StoredMessage[]): OpenAiMessage[] {
  return messages.slice(-HISTORY_TURNS).map((m) => {
    const outcomes = (m.actions ?? []).map(describeAction).join(' ');
    return { role: m.role, content: outcomes ? `${m.content}\n${outcomes}` : m.content };
  });
}

function conversationSource(history: OpenAiMessage[]): LeadAiSource {
  const body = history.map((m) => String(m.content)).join('\n');
  return { key: 'conversation', items: history.length, chars: body.length, tokens: estimateTokens(body), truncated: false };
}

const scope = (entity: CrmLeadEntityType, leadId: string, userId: string) => ({
  entity_type: entity,
  lead_id: new Types.ObjectId(leadId),
  user_id: userId,
});

async function threadMessages(entity: CrmLeadEntityType, leadId: string, userId: string): Promise<StoredMessage[]> {
  const doc: StoredThread = await LeadAiThreadModel.findOne(scope(entity, leadId, userId)).select('messages').lean();
  return doc?.messages ?? [];
}

async function askModel(entity: CrmLeadEntityType, context: LeadAiContext, history: OpenAiMessage[], question: string) {
  const now = new Date();
  const system = await resolvePrompt('crm.lead_assistant', {
    lead_kind: LEAD_KIND_LABEL[entity],
    lead_name: context.lead.display_name,
    now: `${appFormat(now, "EEEE, yyyy-MM-dd'T'HH:mm:ssxxx")}`,
    time_zone: getAppTimeZone(),
    context: context.text,
  });
  const res = await openaiChat({
    task: 'crm.lead_chat',
    detail: `${entity} ask`,
    model: system.model,
    temperature: 0.3,
    json: true,
    messages: [{ role: 'system', content: system.content }, ...history, { role: 'user', content: question }],
  });
  if (!res.ok) throw openAiGraphQLError(res);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(res.content || '{}');
  } catch {
    throw openAiInvalidJsonError();
  }
  const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
  if (!reply) throw openAiInvalidJsonError();
  return {
    reply,
    actions: parseLeadAiActions(parsed.actions, {
      reminders: context.reminders,
      fallbackTo: context.lead.primary_email,
    }),
  };
}

export const leadAiService = {
  /** The agent's conversation about this lead, and what the assistant can see right now. */
  async thread(entity: CrmLeadEntityType, leadId: string, userId: string) {
    const context = await buildLeadAiContext(entity, leadId);
    const messages = await threadMessages(entity, leadId, userId);
    const history = historyOf(messages);
    return {
      messages: messages.map(pubMessage),
      context: contextInfo([...context.sources, conversationSource(history)]),
    };
  },

  /**
   * Answer one question. The question is only saved together with its answer,
   * so a failed model call leaves the thread as it was and the agent can retry.
   */
  async ask(entity: CrmLeadEntityType, leadId: string, userId: string, message: string) {
    const question = (message ?? '').trim();
    if (!question) throw new GraphQLError('A message is required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (question.length > MAX_QUESTION_CHARS) {
      throw new GraphQLError(`Keep the message under ${MAX_QUESTION_CHARS} characters`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const context = await buildLeadAiContext(entity, leadId);
    const history = historyOf(await threadMessages(entity, leadId, userId));
    const { reply, actions } = await askModel(entity, context, history, question);

    const userMsg: StoredMessage = { _id: new Types.ObjectId(), role: 'user', content: question, actions: [], created_at: new Date() };
    const aiMsg: StoredMessage = { _id: new Types.ObjectId(), role: 'assistant', content: reply, actions, created_at: new Date() };
    await LeadAiThreadModel.updateOne(
      scope(entity, leadId, userId),
      { $push: { messages: { $each: [userMsg, aiMsg], $slice: -LEAD_AI_THREAD_CAP } } },
      { upsert: true }
    );
    const sent = [...history, { role: 'user', content: question } as OpenAiMessage];
    return {
      user_message: pubMessage(userMsg),
      assistant_message: pubMessage(aiMsg),
      context: contextInfo([...context.sources, conversationSource(sent)]),
    };
  },

  /** Record what became of a proposal (sent, created, dismissed) so reopening the panel shows it. */
  async setActionStatus(
    entity: CrmLeadEntityType,
    leadId: string,
    userId: string,
    input: { message_id: string; action_index: number; status: LeadAiActionStatus; result_message?: string | null }
  ) {
    const index = Number(input.action_index);
    if (!Types.ObjectId.isValid(input.message_id) || !Number.isInteger(index) || index < 0) {
      throw new GraphQLError('Unknown suggestion', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const messageId = new Types.ObjectId(input.message_id);
    const doc: StoredThread = await LeadAiThreadModel.findOneAndUpdate(
      { ...scope(entity, leadId, userId), messages: { $elemMatch: { _id: messageId, [`actions.${index}`]: { $exists: true } } } },
      {
        $set: {
          [`messages.$[m].actions.${index}.status`]: input.status,
          [`messages.$[m].actions.${index}.result_message`]: (input.result_message ?? '').slice(0, 300),
        },
      },
      { arrayFilters: [{ 'm._id': messageId }], new: true }
    ).lean();
    const msg = doc?.messages?.find((m) => String(m._id) === input.message_id);
    if (!msg) throw new GraphQLError('Unknown suggestion', { extensions: { code: 'NOT_FOUND' } });
    return pubMessage(msg);
  },

  /** Start the conversation over. The lead's own records are untouched. */
  async clear(entity: CrmLeadEntityType, leadId: string, userId: string) {
    if (!Types.ObjectId.isValid(leadId)) return true;
    await LeadAiThreadModel.deleteOne(scope(entity, leadId, userId));
    return true;
  },
};
