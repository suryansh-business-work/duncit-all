import { wordsOf } from './naming';

/**
 * How dangerous a tool is, derived from what it is (query or mutation) and
 * what it is called. It decides the MCP annotations an AI client shows the
 * person, whether a reason is required, and whether the tool insists on an
 * explicit confirmation before it runs.
 *
 *   READ         a query — no change anywhere.
 *   WRITE        a mutation that creates or edits.
 *   DESTRUCTIVE  a mutation that removes, cancels, refunds, overwrites or takes
 *                something away — the kind a person must say yes to first.
 */

export type ToolRisk = 'READ' | 'WRITE' | 'DESTRUCTIVE';
export type OperationKind = 'QUERY' | 'MUTATION';

const DESTRUCTIVE_WORDS = new Set([
  'delete',
  'remove',
  'cancel',
  'revoke',
  'purge',
  'drop',
  'reject',
  'decline',
  'ban',
  'block',
  'deactivate',
  'archive',
  'wipe',
  'reset',
  'clear',
  'disable',
  'terminate',
  'refund',
  'unpublish',
  'hide',
  'suspend',
  'lock',
  'kick',
  'expire',
  'void',
  'restore',
  'overwrite',
  'replace',
  'clone',
  'rollback',
  'backfill',
  'migrate',
  'unassign',
  'withdraw',
]);

/**
 * Not destructive, but consequential enough that a person must say yes first:
 * approvals, money moving, and powers handed to someone.
 */
const CONFIRM_WORDS = new Set([
  'approve',
  'settle',
  'pay',
  'payout',
  'release',
  'transfer',
  'credit',
  'debit',
  'grant',
  'promote',
  'impersonate',
]);

/**
 * Mutations whose NAME carries none of the words above but which still mint
 * value or act on a person live. Named one by one, because the word itself
 * ("generate", "control") is harmless on every other tool that uses it.
 * `controlCrmCall` mutes, holds or hangs up a phone call in progress.
 * `enableAiPromptPublicShare` makes a prompt readable by anyone with the link.
 */
const CONFIRM_FIELDS = new Set([
  'generatePhysicalGiftCards',
  // Gift card orders: booking spends the ShipRocket wallet and sends a courier;
  // stock and the default design change what every member can buy; "printed"
  // releases an order for shipping.
  'bookGiftCardOrderShipment',
  'adjustGiftCardDesignStock',
  'setDefaultGiftCardDesign',
  'markGiftCardOrderPrinted',
  'controlCrmCall',
  'enableAiPromptPublicShare',
  // Approving makes a failed payment refundable; rejecting or closing one as not
  // refundable resolves the buyer's ticket and tells them so.
  'reviewFailedPayment',
  'markFailedPaymentNotRefundable',
  // Money leaving the company's bank account. "withdrawal" is not the word
  // "withdraw", so the keyword rules would let these run unconfirmed.
  'decideWithdrawal',
  'reviewWithdrawal',
  'sendMoney',
  // Rescores every CRM lead of a type with the new scoring model.
  'publishCrmLeadQualityConfig',
  // Reel Studio's AI calls run on Duncit's own model and voice keys. A chat
  // with its own subscription can make the same reel without them (writing the
  // spec itself and saving it with saveReelSpec), so the person must choose
  // which one pays before any of these runs — see REEL_ENGINE_RULE.
  'sendReelMessage',
  'generateReelIdeas',
  'generateReelScript',
  'generateReelVariants',
  'generateReelVoiceover',
  'generateReelSubtitles',
  'recommendNextReel',
  // The social Inbox writing to a real person as the brand: a direct message,
  // and a public reply under their comment. An agent drafts; a person agrees.
  'sendSocialMessage',
  'replyToSocialComment',
  // An auto-reply rule then writes to real people with no one pressing Send
  // (a trusted rule skips Approvals), so making or changing one is agreed first.
  'createSocialAutoReplyRule',
  'updateSocialAutoReplyRule',
]);

/** Words that mean a mutation reaches people or systems outside Duncit. */
const OUTWARD_WORDS = new Set([
  'send',
  'notify',
  'email',
  'whatsapp',
  'sms',
  'broadcast',
  'publish',
  'campaign',
  'dispatch',
  'trigger',
  'invite',
  'remind',
  'post',
  'call',
  'push',
  'sync',
  'upload',
  'payout',
  'refund',
  'pay',
]);

export function riskOf(kind: OperationKind, fieldName: string): ToolRisk {
  if (kind === 'QUERY') return 'READ';
  return wordsOf(fieldName).some((word) => DESTRUCTIVE_WORDS.has(word)) ? 'DESTRUCTIVE' : 'WRITE';
}

/** Whether the tool refuses to run until `mcp_confirm: true` says the person agreed. */
export function needsConfirmation(kind: OperationKind, fieldName: string): boolean {
  if (riskOf(kind, fieldName) === 'DESTRUCTIVE') return true;
  if (kind === 'MUTATION' && CONFIRM_FIELDS.has(fieldName)) return true;
  return kind === 'MUTATION' && wordsOf(fieldName).some((word) => CONFIRM_WORDS.has(word));
}

/** Whether a mutation has effects beyond Duncit's own database (MCP openWorldHint). */
export function reachesOutside(kind: OperationKind, fieldName: string): boolean {
  if (kind === 'QUERY') return false;
  return wordsOf(fieldName).some((word) => OUTWARD_WORDS.has(word));
}
