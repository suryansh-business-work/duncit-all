import { Types } from 'mongoose';
import { firstName } from '@modules/ai/askDuncit/turn/askDuncit.context';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import type { StreamMessage } from '@services/openai/openai.stream';
import { appFormat } from '@utils/app-time';
import { IntelApprovalModel } from '../approvals/intelApproval.model';
import type { TurnContext } from './intel.context';
import { IntelMessageModel } from './intelChat.models';

/**
 * The system prompt (from the AI Library, `intel.system`) and the replayed
 * history. Each replayed assistant message carries what became of the changes
 * it proposed, so "did it go through?" is answered from the real outcome.
 */

const LEVEL_LABEL = { EMPLOYEE: 'Employee', ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin' } as const;
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function writesText(ctx: Pick<TurnContext, 'policy' | 'settings'>): string {
  if (!ctx.policy.can_request_writes) return 'This person may NOT request changes: answer read-only and explain that an Admin can make changes.';
  return ctx.settings.security.four_eyes_production
    ? 'This person may request changes. Staging changes run after they approve them; production changes need a second person (an Admin) to approve.'
    : 'This person may request changes; every change runs only after approval.';
}

export async function systemPrompt(ctx: TurnContext): Promise<string> {
  const name = (await firstName(ctx.actor.user.id)) || 'there';
  const resolved = await resolvePrompt('intel.system', {
    user_name: name,
    level: LEVEL_LABEL[ctx.actor.level],
    now: appFormat(new Date(), "EEEE, yyyy-MM-dd'T'HH:mm:ssxxx"),
    environments: ctx.environments.map(titleCase).join(' and ') || 'none',
    sources: ctx.sources.map((s) => (s === 'MONGODB' ? 'MongoDB' : titleCase(s))).join(', ') || 'none',
    writes: writesText(ctx),
  });
  return resolved.content;
}

export async function historyMessages(ctx: TurnContext, excludeIds: readonly string[]): Promise<StreamMessage[]> {
  const turns = ctx.settings.chat.history_turns;
  const rows = await IntelMessageModel.find({
    conversation_id: ctx.conversation._id,
    owner_id: new Types.ObjectId(ctx.actor.user.id),
    superseded: false,
    _id: { $nin: excludeIds.map((id) => new Types.ObjectId(id)) },
    status: { $in: ['COMPLETE', 'STOPPED'] },
  })
    .sort({ created_at: -1 })
    .limit(turns)
    .select('role content approval_ids')
    .lean();
  rows.reverse();
  const ids = rows.flatMap((m) => m.approval_ids ?? []).filter((id) => Types.ObjectId.isValid(id));
  const approvals = new Map((await IntelApprovalModel.find({ _id: { $in: ids } }, { status: 1, action: 1 }).lean()).map((a) => [String(a._id), a]));
  return rows.map((m) => {
    const outcomes = (m.approval_ids ?? [])
      .map((id) => approvals.get(id))
      .filter((a) => a !== undefined)
      .map((a) => `[change ${a.action}: ${a.status}]`)
      .join(' ');
    return { role: m.role === 'USER' ? 'user' : 'assistant', content: outcomes ? `${m.content}\n${outcomes}` : m.content };
  });
}
