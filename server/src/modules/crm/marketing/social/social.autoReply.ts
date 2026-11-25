import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import {
  continueRun,
  recordStep,
  registerRunHandlers,
  startRun,
  type RunActor,
} from '../runs/marketingRun.service';
import type { MarketingRunDecision, MarketingRunDoc } from '../runs/marketingRun.model';
import {
  CAPPED_STATUSES,
  SocialAutoReplyModel,
  SocialAutoReplyRuleModel,
  type AutoReplyKind,
  type SocialAutoReplyDoc,
  type SocialAutoReplyRuleDoc,
} from './social.autoReply.model';
import { pickDmRule, ruleMatches } from './social.autoReply.match';
import { SocialConversationModel } from './social.conversation.model';
import { sendDirectMessage } from './social.dm.send';
import { sendPrivateReply } from './social.privateReply';
import { loadSocialSettings, type SocialSettings } from './social.settings';
import { messagingWindow } from './social.window';

/**
 * The auto-reply engine. It runs only for an inbound event — a person's new
 * DM, or a new comment — never on its own, so it cannot start a conversation.
 * Before anything is drafted: the master switch is on, the person has not
 * opted out, Meta's 24-hour window is open, and the account is under its daily
 * cap. A reply then waits in Approvals unless Settings sends at once or the
 * rule is trusted; either way it goes through the same send path as a person's
 * reply (social.dm.send.ts / social.privateReply.ts), which checks all of it again.
 */
const COMPONENT = 'social-auto-reply';
const DAY_MS = 86_400_000;
const AUTO_ACTOR: RunActor = { kind: 'AGENT', name: 'Auto-reply' };

export interface InboundDm {
  account_id: string;
  conversation_id: string;
  external_id: string;
  text: string;
  /** Whether this message opened the conversation — what a welcome answers. */
  first_message: boolean;
}

export interface InboundComment {
  account_id: string;
  comment_id: string;
  external_id: string;
  text: string;
}

interface Target {
  account_id: string;
  external_id: string;
  conversation_id?: string;
  comment_id?: string;
}

/** The enabled rules that answer this account, oldest first. */
function rulesFor(accountId: string, kinds: readonly AutoReplyKind[]) {
  return SocialAutoReplyRuleModel.find({
    enabled: true,
    kind: { $in: kinds },
    $or: [{ account_ids: { $size: 0 } }, { account_ids: accountId }],
  })
    .sort({ created_at: 1, _id: 1 })
    .lean<SocialAutoReplyRuleDoc[]>();
}

/** Under the cap: replies sent or waiting for a yes in the last 24 hours, for this account. */
async function underCap(accountId: string, settings: SocialSettings): Promise<boolean> {
  const since = new Date(Date.now() - DAY_MS);
  const used = await SocialAutoReplyModel.countDocuments({ account_id: accountId, status: { $in: CAPPED_STATUSES }, created_at: { $gte: since } });
  return used < settings.auto_reply_daily_cap;
}

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 1000);

/** Send a drafted reply through the person-facing send path, and keep how it went. */
async function sendReply(reply: SocialAutoReplyDoc, parentRunId?: string): Promise<void> {
  const sender = { automation_rule_id: reply.rule_id, ...(parentRunId ? { parent_run_id: parentRunId } : {}) };
  try {
    if (!(await loadSocialSettings()).auto_reply_enabled) throw new Error('Auto-replies were switched off before this one was sent.');
    if (reply.conversation_id) await sendDirectMessage(reply.conversation_id, reply.text, sender);
    else await sendPrivateReply(reply.comment_id ?? '', reply.text, sender);
    await SocialAutoReplyModel.updateOne({ _id: reply._id }, { $set: { status: 'SENT', error: '' } });
  } catch (error) {
    await SocialAutoReplyModel.updateOne({ _id: reply._id }, { $set: { status: 'FAILED', error: reasonOf(error) } });
    throw error;
  }
}

/** Draft the rule's reply once per inbound event, then send it or leave it in Approvals. */
async function fire(rule: SocialAutoReplyRuleDoc, target: Target, settings: SocialSettings): Promise<void> {
  if (!(await underCap(target.account_id, settings))) {
    logs.server.info(COMPONENT, 'cap', { account_id: target.account_id, rule_id: String(rule._id), msg: 'daily cap reached; no auto-reply' });
    return;
  }
  const needsApproval = settings.auto_reply_requires_approval && !rule.trusted;
  let reply: SocialAutoReplyDoc;
  try {
    reply = (
      await SocialAutoReplyModel.create({
        trigger_key: `${target.account_id}:${target.external_id}`,
        rule_id: String(rule._id),
        rule_name: rule.name,
        kind: rule.kind,
        account_id: target.account_id,
        conversation_id: target.conversation_id ?? '',
        comment_id: target.comment_id ?? '',
        text: rule.reply_text,
        status: needsApproval ? 'AWAITING_APPROVAL' : 'SENT',
      })
    ).toObject<SocialAutoReplyDoc>();
  } catch (error) {
    if (isDuplicateKeyError(error)) return; // This event was already answered.
    throw error;
  }
  if (!needsApproval) {
    await sendReply(reply).catch((error: unknown) => logs.server.warn(COMPONENT, 'send', { error, rule_id: reply.rule_id }));
    return;
  }
  const runId = await startRun({
    workflow: 'INBOX_REPLY',
    name: `Auto-reply “${rule.name}” waiting for approval`,
    trigger: 'WEBHOOK',
    actor: AUTO_ACTOR,
    links: { account_id: target.account_id },
    approval_required: true,
  });
  await recordStep(runId, 'draft', { status: 'WAITING', label: 'Reply to send once approved', output_summary: rule.reply_text });
  await SocialAutoReplyModel.updateOne({ _id: reply._id }, { $set: { run_id: runId } });
}

export async function autoReplyToDm(dm: InboundDm): Promise<void> {
  const settings = await loadSocialSettings();
  if (!settings.auto_reply_enabled) return;
  const conversation = await SocialConversationModel.findById(dm.conversation_id).select('opted_out last_inbound_at').lean();
  if (!conversation || conversation.opted_out) return;
  if (messagingWindow(conversation.last_inbound_at).state !== 'OPEN') return;
  const rule = pickDmRule(await rulesFor(dm.account_id, ['KEYWORD', 'FAQ', 'WELCOME']), dm.text, dm.first_message);
  if (rule) await fire(rule, { account_id: dm.account_id, external_id: dm.external_id, conversation_id: dm.conversation_id }, settings);
}

/** Comment-to-DM: a comment holding one of the rule's phrases gets one private reply. */
export async function autoReplyToComment(comment: InboundComment): Promise<void> {
  const settings = await loadSocialSettings();
  if (!settings.auto_reply_enabled) return;
  const rule = (await rulesFor(comment.account_id, ['COMMENT_TO_DM'])).find((one) => ruleMatches(one, comment.text, false));
  if (rule) await fire(rule, { account_id: comment.account_id, external_id: comment.external_id, comment_id: comment.comment_id }, settings);
}

/** A person decided on an auto-reply that waited: approved, it is sent under the same run; otherwise it is kept as rejected. */
export async function onAutoReplyDecision(run: MarketingRunDoc, decision: MarketingRunDecision): Promise<void> {
  const runId = String(run._id);
  const reply = await SocialAutoReplyModel.findOne({ run_id: runId, status: 'AWAITING_APPROVAL' }).lean<SocialAutoReplyDoc>();
  if (!reply) return; // Not an auto-reply run, or already handled.
  if (decision !== 'APPROVED') {
    await SocialAutoReplyModel.updateOne({ _id: reply._id }, { $set: { status: 'REJECTED' } });
    return;
  }
  await continueRun(runId, (ctx) => ctx.step('send', 'Send the approved reply', () => sendReply(reply, runId)));
}

registerRunHandlers('INBOX_REPLY', { onDecision: onAutoReplyDecision });
