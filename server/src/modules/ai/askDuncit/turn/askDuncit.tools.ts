import type { ChatToolDef } from '@services/openai/openai.stream';
import { HANDOVER_TEAMS } from '../conversation/askDuncitConversation.model';
import { askDuncitMemory } from '../conversation/askDuncit.memory';
import { handOver } from '../handover/askDuncit.handover';
import { passagesText, searchKnowledge, type KnowledgePassage } from '../knowledge/askDuncit.knowledge';
import { callTool, describeTool, findTools, type EngineIds, type EngineResult } from '../mcp/askDuncit.engine';
import { fenceUntrusted } from '../guard/askDuncit.guard';
import type { TurnContext } from './askDuncit.context';

/**
 * The function tools the model is offered on a turn, and their dispatch.
 * Which ones are offered follows the feature switches; what call_tool can
 * reach follows the capability set — the model cannot widen either.
 */

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]): ChatToolDef => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } },
});

const str = (description: string, maxLength = 300) => ({ type: 'string', description, maxLength });

export function toolDefinitions(ctx: TurnContext): ChatToolDef[] {
  const defs: ChatToolDef[] = [
    fn('find_tools', 'Find Duncit tools this person may use, by a few words about the task (e.g. "my upcoming pods", "update profile").', { query: str('What you want to do.', 200), limit: { type: 'integer', minimum: 1, maximum: 12 } }, ['query']),
    fn('describe_tool', 'Read one tool’s parameters before calling it. Only names returned by find_tools.', { name: str('Tool name from find_tools.', 120) }, ['name']),
    fn('call_tool', 'Run a tool for the person. Changes wait for their approval and return "awaiting_approval".', {
      name: str('Tool name from find_tools.', 120),
      arguments: { type: 'object', description: 'The tool’s parameters, exactly as describe_tool showed.' },
      reason: str('One sentence: why the person wants this.', 300),
    }, ['name', 'arguments', 'reason']),
    fn('flag_out_of_context', 'Record that the request is not about Duncit, before declining it.', { reason: str('Why it is out of scope.', 200) }, ['reason']),
  ];
  const { features } = ctx.settings;
  if (features.knowledge_base) {
    defs.push(fn('search_knowledge', 'Search Duncit help articles, SOPs and FAQs.', { query: str('What to look up.', 200) }, ['query']));
  }
  if (features.memory) {
    defs.push(fn('remember_fact', 'Remember a lasting preference or fact the person asked you to remember.', { fact: str('The fact, in one short sentence.', 200) }, ['fact']));
  }
  if (features.handover) {
    defs.push(fn('request_handover', 'Hand the conversation to a human team as a support ticket.', {
      team: { type: 'string', enum: [...HANDOVER_TEAMS] },
      summary: str('What the person needs, in two sentences.', 600),
    }, ['team', 'summary']));
  }
  return defs;
}

export interface DispatchEffects {
  outOfContextReason?: string;
  handover?: { ticket_id: string; ticket_no: string; team: string };
  knowledge?: KnowledgePassage[];
}

export interface DispatchResult extends EngineResult {
  effects: DispatchEffects;
}

const out = (content: unknown, effects: DispatchEffects = {}): DispatchResult => ({ content: JSON.stringify(content), effects });

/** Arguments arrive as a JSON string; a malformed one is the model's error to fix. */
export function parseArguments(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function dispatchTool(ctx: TurnContext, ids: EngineIds, name: string, rawArgs: string): Promise<DispatchResult> {
  const args = parseArguments(rawArgs);
  if (!args) return out({ error: 'The arguments were not valid JSON. Try again.' });
  switch (name) {
    case 'find_tools':
      return { ...findTools(ctx, args.query, args.limit), effects: {} };
    case 'describe_tool':
      return { ...(await describeTool(ctx, ids, args.name)), effects: {} };
    case 'call_tool':
      return { ...(await callTool(ctx, ids, args.name, args.arguments, args.reason)), effects: {} };
    case 'flag_out_of_context':
      return out({ recorded: true }, { outOfContextReason: String(args.reason ?? '').slice(0, 200) });
    case 'search_knowledge': {
      if (!ctx.settings.features.knowledge_base) break;
      const passages = await searchKnowledge(String(args.query ?? ''), ctx.role);
      return { content: fenceUntrusted('knowledge', passagesText(passages)), effects: { knowledge: passages } };
    }
    case 'remember_fact': {
      if (!ctx.settings.features.memory) break;
      const saved = await askDuncitMemory.remember(ctx.user.id, String(args.fact ?? ''), ids.conversationId);
      return out(saved);
    }
    case 'request_handover': {
      if (!ctx.settings.features.handover) break;
      const result = await handOver(ctx, ids.conversationId, args.team, args.summary);
      return out({ status: 'handed_over', ticket: result.ticket_no || result.ticket_id, team: result.team }, { handover: result });
    }
    default:
      break;
  }
  return out({ error: `There is no tool called ${name}.` });
}
