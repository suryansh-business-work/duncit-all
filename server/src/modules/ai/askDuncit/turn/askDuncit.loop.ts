import { foldRound, roundWriter } from '@services/openai/openai.loop';
import { openaiChatStream, type StreamMessage } from '@services/openai/openai.stream';
import type { MessageToolCall } from '../conversation/askDuncitMessage.model';
import type { IAskDuncitConversation } from '../conversation/askDuncitConversation.model';
import type { KnowledgePassage } from '../knowledge/askDuncit.knowledge';
import type { TurnContext } from './askDuncit.context';
import { historyMessages, systemPrompt } from './askDuncit.prompt';
import { deltaBatcher, emitToUser } from './askDuncit.stream';
import { dispatchTool, toolDefinitions, type DispatchEffects } from './askDuncit.tools';

/**
 * One turn's model loop: stream an answer; when the model asks for tools, run
 * them (each through the engine's permission checks) and stream again, up to
 * the configured number of tool rounds. What the person sees streaming is
 * exactly what is stored — every round's text, in order.
 */

export interface LoopInput {
  ctx: TurnContext;
  conversation: IAskDuncitConversation;
  conversationId: string;
  userMessageId: string;
  messageId: string;
  userContent: unknown;
  knowledge: KnowledgePassage[];
  model: string;
  signal: AbortSignal;
}

export interface LoopOutcome {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  toolCalls: MessageToolCall[];
  actionIds: string[];
  effects: DispatchEffects;
  knowledge: KnowledgePassage[];
  firstTokenMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  aborted: boolean;
}

function mergeEffects(into: DispatchEffects, next: DispatchEffects): void {
  if (next.outOfContextReason) into.outOfContextReason = next.outOfContextReason;
  if (next.handover) into.handover = next.handover;
  if (next.knowledge?.length) into.knowledge = [...(into.knowledge ?? []), ...next.knowledge];
}

export async function runLoop(input: LoopInput): Promise<LoopOutcome> {
  const { ctx, conversationId, messageId } = input;
  const started = Date.now();
  const system = await systemPrompt(ctx, input.conversation, input.knowledge);
  const history = await historyMessages(ctx.user.id, conversationId, [messageId, input.userMessageId], ctx.settings.history_turns);
  const messages: StreamMessage[] = [{ role: 'system', content: system.content }, ...history, { role: 'user', content: input.userContent }];
  const tools = toolDefinitions(ctx);
  const ids = { conversationId, messageId };
  const out: LoopOutcome = {
    content: '',
    model: input.model,
    promptTokens: 0,
    completionTokens: 0,
    toolCalls: [],
    actionIds: [],
    effects: {},
    knowledge: [...input.knowledge],
    firstTokenMs: 0,
    errorCode: null,
    errorMessage: null,
    aborted: false,
  };
  const batch = deltaBatcher((text) => emitToUser(ctx.user.id, 'delta', { message_id: messageId, text }));
  const maxTokens = Math.min(ctx.policy.max_output_tokens, ctx.settings.max_output_tokens);
  const rounds = ctx.settings.max_tool_rounds;

  for (let round = 0; round <= rounds; round += 1) {
    const write = roundWriter(out, (text) => batch.push(text));
    const res = await openaiChatStream({
      task: 'ask_duncit.chat',
      model: input.model,
      messages,
      tools: round < rounds ? tools : undefined,
      temperature: ctx.settings.temperature,
      max_tokens: maxTokens,
      detail: `${ctx.role} · conversation ${conversationId}`,
      user_id: ctx.user.id,
      signal: input.signal,
      onDelta: (text) => {
        if (!out.firstTokenMs) out.firstTokenMs = Date.now() - started;
        write(text);
      },
    });
    const assistantTurn = foldRound(out, res);
    if (!assistantTurn || !res.ok) break;
    messages.push(assistantTurn);
    for (const call of res.toolCalls) {
      emitToUser(ctx.user.id, 'tool', { message_id: messageId, name: call.name, status: 'RUNNING' });
      const result = await dispatchTool(ctx, ids, call.name, call.arguments);
      mergeEffects(out.effects, result.effects);
      if (result.call) {
        out.toolCalls.push(result.call);
        if (result.call.action_id) out.actionIds.push(result.call.action_id);
        emitToUser(ctx.user.id, 'tool', { message_id: messageId, name: result.call.name, title: result.call.title, status: result.call.status });
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: result.content });
    }
    if (input.signal.aborted) {
      out.aborted = true;
      break;
    }
  }
  batch.end();
  if (out.effects.knowledge?.length) out.knowledge = [...out.knowledge, ...out.effects.knowledge];
  return out;
}
