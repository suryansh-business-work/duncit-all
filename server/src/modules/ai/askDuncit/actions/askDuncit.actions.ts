import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { McpTool } from '@microservices/mcp/tools/tool.types';
import { HARD_LIMITS } from '../askDuncit.constants';
import { maskSensitiveText, maskToolArgs } from '../audit/askDuncit.redact';
import { recordAudit } from '../audit/askDuncitAudit.service';
import { AskDuncitMessageModel } from '../conversation/askDuncitMessage.model';
import { runAsPerson } from '../mcp/askDuncit.run';
import type { TurnContext } from '../turn/askDuncit.context';
import { emitToUser } from '../turn/askDuncit.stream';
import { AskDuncitActionModel, type ActionStatus, type IAskDuncitAction } from './askDuncitAction.model';
import { rollbackPlanFor } from './askDuncit.rollback';

/**
 * Proposals the person approves or rejects. See askDuncitAction.model.ts for
 * the state machine; every transition here is a compare-and-set on `status`,
 * which is what makes approval idempotent under double taps and retries.
 */

const fail = (code: string, message: string) => new GraphQLError(message, { extensions: { code } });

export const pubAction = (a: IAskDuncitAction) => ({
  id: String(a._id),
  conversation_id: String(a.conversation_id),
  message_id: a.message_id,
  tool: a.tool,
  tool_title: a.tool_title,
  category: a.category,
  risk: a.risk,
  args_preview: a.args_preview,
  reason: a.reason,
  status: a.status,
  expires_at: a.expires_at.toISOString(),
  decided_at: a.decided_at?.toISOString() ?? null,
  executed_at: a.executed_at?.toISOString() ?? null,
  result_preview: a.result_preview,
  error_message: a.error_message,
  can_rollback: a.status === 'EXECUTED' && a.rollback?.status === 'AVAILABLE',
  created_at: a.created_at.toISOString(),
});

/** Move PENDING-and-past-due rows to EXPIRED. Cheap; run before reads. */
export async function expireStale(userId?: string): Promise<void> {
  await AskDuncitActionModel.updateMany(
    { status: 'PENDING', expires_at: { $lt: new Date() }, ...(userId ? { user_id: userId } : {}) },
    { $set: { status: 'EXPIRED' } }
  );
}

async function transition(id: Types.ObjectId, from: ActionStatus, set: Record<string, unknown>) {
  return AskDuncitActionModel.findOneAndUpdate({ _id: id, status: from }, { $set: set }, { new: true }).lean<IAskDuncitAction>();
}

/** The tool call on the proposing message follows the action's outcome. */
async function syncToolCall(action: IAskDuncitAction, status: string, errorCode = '') {
  if (!action.message_id || !Types.ObjectId.isValid(action.message_id)) return;
  await AskDuncitMessageModel.updateOne(
    { _id: new Types.ObjectId(action.message_id), 'tool_calls.action_id': String(action._id) },
    { $set: { 'tool_calls.$.status': status, 'tool_calls.$.error_code': errorCode } }
  );
}

const preview = (data: unknown) => maskSensitiveText(JSON.stringify(data ?? null), 600);

export const askDuncitActions = {
  async propose(ctx: TurnContext, ids: { conversationId: string; messageId: string }, tool: McpTool, args: Record<string, unknown>, reason: string) {
    const doc = await AskDuncitActionModel.create({
      user_id: ctx.user.id,
      conversation_id: new Types.ObjectId(ids.conversationId),
      message_id: ids.messageId,
      role_key: ctx.role,
      tool: tool.name,
      tool_title: tool.title,
      category: tool.category,
      risk: tool.risk,
      args,
      args_preview: maskToolArgs(args),
      reason: maskSensitiveText(reason, 500),
      expires_at: new Date(Date.now() + HARD_LIMITS.pendingActionTtlMs),
    });
    const action = doc.toObject() as IAskDuncitAction;
    await recordAudit({
      type: 'ACTION_PROPOSED',
      actor: ctx.actor,
      conversation_id: ids.conversationId,
      message_id: ids.messageId,
      action_id: String(action._id),
      tool: tool.name,
      tool_args: args,
      reason,
    });
    emitToUser(ctx.user.id, 'action', { action: pubAction(action) });
    return action;
  },

  /** The person's own action, or NOT_FOUND — never anyone else's. */
  async getOwned(userId: string, id: string): Promise<IAskDuncitAction> {
    if (!Types.ObjectId.isValid(id)) throw fail('NOT_FOUND', 'Action not found');
    await expireStale(userId);
    const action = await AskDuncitActionModel.findOne({ _id: id, user_id: userId }).lean<IAskDuncitAction>();
    if (!action) throw fail('NOT_FOUND', 'Action not found');
    return action;
  },

  async reject(ctx: TurnContext, action: IAskDuncitAction) {
    const done = await transition(action._id, 'PENDING', { status: 'REJECTED', decided_at: new Date() });
    if (!done) throw fail('CONFLICT', 'This action was already decided');
    await syncToolCall(done, 'DENIED', 'REJECTED');
    await recordAudit({ type: 'ACTION_REJECTED', actor: ctx.actor, action_id: String(done._id), conversation_id: String(done.conversation_id), tool: done.tool });
    emitToUser(ctx.user.id, 'action', { action: pubAction(done) });
    return done;
  },

  async approve(ctx: TurnContext, action: IAskDuncitAction) {
    const claimed = await transition(action._id, 'PENDING', { status: 'EXECUTING', decided_at: new Date() });
    if (!claimed) throw fail('CONFLICT', 'This action was already decided');
    const audit = { actor: ctx.actor, action_id: String(claimed._id), conversation_id: String(claimed.conversation_id), tool: claimed.tool };
    await recordAudit({ type: 'ACTION_APPROVED', ...audit });

    // Permission is re-checked NOW, with the person's roles as they are now.
    const tool = ctx.caps.byName.get(claimed.tool);
    if (!tool) {
      const failed = await transition(claimed._id, 'EXECUTING', { status: 'FAILED', error_code: 'FORBIDDEN', error_message: 'No longer allowed for your role' });
      await recordAudit({ type: 'VIOLATION', violation_kind: 'UNAUTHORIZED_TOOL', status: 'DENIED', reason: 'Approved action no longer permitted', ...audit });
      if (failed) emitToUser(ctx.user.id, 'action', { action: pubAction(failed) });
      return failed ?? claimed;
    }

    const outcome = await runAsPerson(ctx, tool, claimed.args, claimed.reason, { approved: true });
    if (!outcome.ok) {
      const failed = await transition(claimed._id, 'EXECUTING', {
        status: 'FAILED',
        error_code: outcome.error?.code ?? 'ERROR',
        error_message: maskSensitiveText(outcome.error?.message, 500),
      });
      await syncToolCall(claimed, 'ERROR', outcome.error?.code);
      await recordAudit({ type: 'ACTION_FAILED', status: 'FAILED', error_code: outcome.error?.code, error_message: outcome.error?.message, latency_ms: outcome.durationMs, ...audit });
      if (failed) emitToUser(ctx.user.id, 'action', { action: pubAction(failed) });
      return failed ?? claimed;
    }

    const plan = ctx.settings.features.rollback && tool.source === 'graphql' ? rollbackPlanFor(tool.field, claimed.args) : null;
    const inverse = plan ? ctx.session.catalog.tools.find((t) => t.source === 'graphql' && t.field === plan.field) : undefined;
    const executed = await transition(claimed._id, 'EXECUTING', {
      status: 'EXECUTED',
      executed_at: new Date(),
      result_preview: preview(outcome.data),
      rollback: plan && inverse ? { tool: inverse.name, args: plan.args, status: 'AVAILABLE', at: null, error_message: '' } : null,
    });
    await syncToolCall(claimed, 'OK');
    await recordAudit({ type: 'ACTION_EXECUTED', latency_ms: outcome.durationMs, tool_args: claimed.args, ...audit });
    if (executed) emitToUser(ctx.user.id, 'action', { action: pubAction(executed) });
    return executed ?? claimed;
  },

  async rollback(ctx: TurnContext, action: IAskDuncitAction) {
    if (!ctx.settings.features.rollback) throw fail('FEATURE_DISABLED', 'Undo is switched off');
    if (action.status !== 'EXECUTED' || action.rollback?.status !== 'AVAILABLE') {
      throw fail('BAD_USER_INPUT', 'This action cannot be undone');
    }
    const claimed = await AskDuncitActionModel.findOneAndUpdate(
      { _id: action._id, status: 'EXECUTED', 'rollback.status': 'AVAILABLE' },
      { $set: { 'rollback.status': 'DONE', 'rollback.at': new Date() } },
      { new: true }
    ).lean<IAskDuncitAction>();
    if (!claimed?.rollback) throw fail('CONFLICT', 'This action was already undone');
    const audit = { actor: ctx.actor, action_id: String(claimed._id), conversation_id: String(claimed.conversation_id), tool: claimed.rollback.tool };
    const tool = ctx.caps.byName.get(claimed.rollback.tool);
    const outcome = tool ? await runAsPerson(ctx, tool, claimed.rollback.args, `Undo ${claimed.tool_title}`, { approved: true }) : null;
    if (!outcome?.ok) {
      const message = outcome?.error?.message ?? 'Undo is not allowed for your role';
      await AskDuncitActionModel.updateOne({ _id: claimed._id }, { $set: { 'rollback.status': 'FAILED', 'rollback.error_message': maskSensitiveText(message, 500) } });
      await recordAudit({ type: 'ACTION_FAILED', status: 'FAILED', error_code: outcome?.error?.code ?? 'FORBIDDEN', error_message: message, ...audit });
      throw fail(outcome?.error?.code ?? 'FORBIDDEN', message);
    }
    const done = await transition(claimed._id, 'EXECUTED', { status: 'ROLLED_BACK' });
    await recordAudit({ type: 'ACTION_ROLLED_BACK', latency_ms: outcome.durationMs, ...audit });
    if (done) emitToUser(ctx.user.id, 'action', { action: pubAction(done) });
    return done ?? claimed;
  },

  async listForUser(userId: string, limit = 50) {
    await expireStale(userId);
    const rows = await AskDuncitActionModel.find({ user_id: userId }).sort({ created_at: -1 }).limit(Math.min(limit, 100)).lean<IAskDuncitAction[]>();
    return rows.map(pubAction);
  },

  async byIds(userId: string, ids: readonly string[]) {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    if (!valid.length) return [];
    await expireStale(userId);
    return AskDuncitActionModel.find({ _id: { $in: valid }, user_id: userId }).lean<IAskDuncitAction[]>();
  },
};
