import { Types } from 'mongoose';
import { categoryLabel } from '@microservices/mcp/catalog/categories';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import type { StreamMessage } from '@services/openai/openai.stream';
import type { AskDuncitRoleKey } from '../askDuncit.constants';
import { askDuncitActions } from '../actions/askDuncit.actions';
import { askDuncitMemory } from '../conversation/askDuncit.memory';
import type { IAskDuncitConversation } from '../conversation/askDuncitConversation.model';
import { AskDuncitMessageModel, type IAskDuncitMessage } from '../conversation/askDuncitMessage.model';
import { passagesText, type KnowledgePassage } from '../knowledge/askDuncit.knowledge';
import type { TurnContext } from './askDuncit.context';

/** The role as the MODEL reads it (the app shows its own localized label). */
const ROLE_LABEL: Readonly<Record<AskDuncitRoleKey, string>> = {
  MEMBER: 'Member',
  HOST: 'Host',
  VENUE_OWNER: 'Venue owner',
  CLUB_ADMIN: 'Club admin',
  REGIONAL_CLUB_ADMIN: 'Regional club admin',
  ECOMM_BRAND: 'Partner brand seller',
  FREELANCER: 'Freelancer',
  STAFF: 'Duncit staff',
  SUPER_ADMIN: 'Super admin',
};

export function capabilitiesText(ctx: Pick<TurnContext, 'caps'>): string {
  const counts = new Map<string, number>();
  for (const tool of ctx.caps.tools) counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
  const areas = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key]) => categoryLabel(key));
  const mode = ctx.caps.canWrite ? 'Read & write — every change waits for the person’s approval' : 'Read-only — you cannot change anything';
  return `${mode}. Areas: ${areas.join(', ') || 'none'}.`;
}

export function pageText(ctx: Pick<TurnContext, 'page'>): string {
  const { route, entity_type, entity_id } = ctx.page;
  if (!route && !entity_type) return 'Not on a specific page.';
  const entity = entity_type ? ` · ${entity_type.toLowerCase()} ${entity_id || ''}`.trimEnd() : '';
  return `${route || 'app'}${entity}`;
}

export async function systemPrompt(ctx: TurnContext, conversation: IAskDuncitConversation, knowledge: readonly KnowledgePassage[]) {
  const now = new Date();
  const memory = await askDuncitMemory.promptBlock(ctx.user.id, conversation, ctx.settings.features.memory);
  return resolvePrompt('ask_duncit.system', {
    role_label: ROLE_LABEL[ctx.role],
    user_name: ctx.userName || 'there',
    locale: ctx.locale || 'en',
    now: appFormat(now, "EEEE, yyyy-MM-dd'T'HH:mm:ssxxx"),
    time_zone: getAppTimeZone(),
    page_context: pageText(ctx),
    capabilities: capabilitiesText(ctx),
    memory,
    knowledge: passagesText(knowledge),
    role_instructions: ctx.policy.instructions.trim() || 'None.',
  });
}

/**
 * The replayed history: the last N finished messages, each assistant message
 * followed by what became of the changes it proposed, so a follow-up such as
 * "did that work?" is answered from the real outcome.
 */
export async function historyMessages(userId: string, conversationId: string, excludeIds: readonly string[], turns: number): Promise<StreamMessage[]> {
  if (turns <= 0) return [];
  const rows = await AskDuncitMessageModel.find({
    conversation_id: new Types.ObjectId(conversationId),
    _id: { $nin: excludeIds.map((id) => new Types.ObjectId(id)) },
    status: { $in: ['COMPLETE', 'STOPPED'] },
  })
    .sort({ created_at: -1 })
    .limit(turns)
    .select('role content action_ids attachments')
    .lean<Array<Pick<IAskDuncitMessage, 'role' | 'content' | 'action_ids' | 'attachments'>>>();
  rows.reverse();
  const actionIds = rows.flatMap((m) => m.action_ids ?? []);
  const actions = new Map((await askDuncitActions.byIds(userId, actionIds)).map((a) => [String(a._id), a]));
  return rows.map((m) => {
    const outcomes = (m.action_ids ?? [])
      .map((id) => actions.get(id))
      .filter((a) => a !== undefined)
      .map((a) => `[${a.tool_title}: ${a.status}]`)
      .join(' ');
    const files = m.attachments?.length ? ` [${m.attachments.length} attachment(s) earlier]` : '';
    return { role: m.role, content: `${m.content}${files}${outcomes ? `\n${outcomes}` : ''}` };
  });
}
