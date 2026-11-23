import { deltaBatcher } from '@modules/ai/askDuncit/turn/askDuncit.stream';
import { foldRound, roundWriter } from '@services/openai/openai.loop';
import type { StreamedToolCall } from '@services/openai/openai.sse';
import { openaiChatStream, type StreamMessage } from '@services/openai/openai.stream';
import { intelOpenAiCredentials } from '../index/intel.openai';
import { INTEL_LIMITS } from '../intel.constants';
import type { TurnContext } from './intel.context';
import type { MessageCitation, MessageToolCall } from './intelChat.models';
import { historyMessages, systemPrompt } from './intel.prompt';
import { emitIntel } from './intel.stream';
import { dispatchTool, toolDefinitions } from './tools';

/**
 * One turn's model loop: stream an answer; when the model asks for tools, run
 * them (each through its own permission checks) and stream again, up to the
 * configured number of tool rounds. What streams is exactly what is stored.
 */

export interface LoopOutcome {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  toolCalls: MessageToolCall[];
  citations: MessageCitation[];
  approvalIds: string[];
  errorCode: string | null;
  errorMessage: string | null;
  aborted: boolean;
}

/**
 * Runs one round's tool calls side by side (each still passes its own
 * permission checks) and answers the tool messages in the order the model
 * asked for them. Searches reserve their [S#] numbers in one synchronous
 * step, so running them together never repeats a number.
 */
async function runToolCalls(ctx: TurnContext, calls: readonly StreamedToolCall[], out: LoopOutcome): Promise<StreamMessage[]> {
  const userId = ctx.actor.user.id;
  const results = await Promise.all(
    calls.map(async (call) => {
      emitIntel(userId, 'tool', { message_id: ctx.messageId, name: call.name, status: 'RUNNING' });
      const result = await dispatchTool(ctx, call.name, call.arguments);
      emitIntel(userId, 'tool', { message_id: ctx.messageId, name: call.name, title: result.call.title, status: result.call.status, approval_id: result.approvalId ?? null });
      return { call, result };
    })
  );
  return results.map(({ call, result }) => {
    out.toolCalls.push(result.call);
    if (result.citations) out.citations.push(...result.citations);
    if (result.approvalId) out.approvalIds.push(result.approvalId);
    return { role: 'tool' as const, tool_call_id: call.id, content: result.content };
  });
}

export async function runLoop(ctx: TurnContext, userMessageId: string, userText: string, signal: AbortSignal): Promise<LoopOutcome> {
  const userId = ctx.actor.user.id;
  const messages: StreamMessage[] = [{ role: 'system', content: await systemPrompt(ctx) }, ...(await historyMessages(ctx, [ctx.messageId, userMessageId])), { role: 'user', content: userText }];
  const tools = toolDefinitions(ctx);
  const credentials = await intelOpenAiCredentials(ctx.settings);
  const out: LoopOutcome = { content: '', model: ctx.model, promptTokens: 0, completionTokens: 0, toolCalls: [], citations: [], approvalIds: [], errorCode: null, errorMessage: null, aborted: false };
  const batch = deltaBatcher((text) => emitIntel(userId, 'delta', { message_id: ctx.messageId, text }));
  const rounds = Math.min(ctx.settings.chat.max_tool_rounds, INTEL_LIMITS.maxToolRounds);

  for (let round = 0; round <= rounds; round += 1) {
    const write = roundWriter(out, (text) => batch.push(text));
    const res = await openaiChatStream({
      task: 'intel.chat',
      model: ctx.model,
      messages,
      tools: round < rounds && tools.length ? tools : undefined,
      temperature: ctx.settings.chat.temperature,
      max_tokens: ctx.settings.chat.max_output_tokens,
      detail: `${ctx.actor.level} · conversation ${ctx.conversationId}`,
      user_id: userId,
      signal,
      credentials,
      onDelta: write,
    });
    const assistantTurn = foldRound(out, res);
    if (!assistantTurn || !res.ok) break;
    messages.push(assistantTurn);
    messages.push(...(await runToolCalls(ctx, res.toolCalls, out)));
    if (signal.aborted) {
      out.aborted = true;
      break;
    }
  }
  batch.end();
  return out;
}

/** Only citations the answer actually uses are kept — a source shown is a source relied on. */
export function usedCitations(content: string, citations: readonly MessageCitation[]): MessageCitation[] {
  const used = new Set([...content.matchAll(/\[(S\d+)\]/g)].map((m) => m[1]));
  return citations.filter((c) => used.has(c.ref));
}
