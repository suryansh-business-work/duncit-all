import type { ChatToolDef } from '@services/openai/openai.stream';
import type { MessageCitation, MessageToolCall } from '../intelChat.models';
import type { TurnContext } from '../intel.context';

/** One tool the assistant may call, and what running it produces. */

export interface ToolOutcome {
  /** What the model reads back (fenced as untrusted where it came from outside). */
  content: string;
  call: MessageToolCall;
  citations?: MessageCitation[];
  approvalId?: string;
}

export interface IntelTool {
  def: ChatToolDef;
  /** Offered this turn? (source, environment and policy checks) */
  available(ctx: TurnContext): boolean;
  run(ctx: TurnContext, args: Record<string, unknown>): Promise<ToolOutcome>;
}

export const failed = (name: string, title: string, message: string, status: MessageToolCall['status'] = 'FAILED'): ToolOutcome => ({
  content: JSON.stringify({ error: message }),
  call: { name, title, status, summary: message.slice(0, 300) },
});

export const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');
