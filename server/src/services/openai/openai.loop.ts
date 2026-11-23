import type { StreamChatResult, StreamMessage } from './openai.stream';

/**
 * The bookkeeping every streamed tool loop repeats (Ask Duncit, Duncit Intel):
 * joining the text of successive rounds, and folding each round's result into
 * the loop's totals. Kept here so the two assistants cannot drift apart.
 */

/** Totals a tool loop keeps across rounds. */
export interface LoopTotals {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  errorCode: string | null;
  errorMessage: string | null;
  aborted: boolean;
}

/**
 * The text writer for one round: rounds are joined by a blank line, written
 * only once the new round actually produces text (a tool-only round adds none).
 */
export function roundWriter(target: Pick<LoopTotals, 'content'>, push: (text: string) => void): (text: string) => void {
  const separator = target.content ? '\n\n' : '';
  let wroteSeparator = false;
  return (text: string) => {
    if (!wroteSeparator && separator) {
      target.content += separator;
      push(separator);
      wroteSeparator = true;
    }
    target.content += text;
    push(text);
  };
}

/**
 * Folds one round into the totals. Answers the assistant tool-call turn to
 * replay to the model before the tool results, or null when the loop is done
 * (an error, a stop, or an answer with no tool calls).
 */
export function foldRound(out: LoopTotals, res: StreamChatResult): StreamMessage | null {
  if (!res.ok) {
    out.aborted = res.code === 'ABORTED';
    out.errorCode = res.code;
    out.errorMessage = res.message;
    return null;
  }
  out.model = res.model;
  out.promptTokens += res.usage.prompt_tokens;
  out.completionTokens += res.usage.completion_tokens;
  if (!res.toolCalls.length) return null;
  return {
    role: 'assistant',
    content: res.content || null,
    tool_calls: res.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } })),
  };
}
