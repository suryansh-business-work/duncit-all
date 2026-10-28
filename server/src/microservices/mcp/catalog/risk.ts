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
 * value. Named one by one, because the word itself ("generate") is harmless on
 * every other tool that uses it.
 */
const CONFIRM_FIELDS = new Set(['generatePhysicalGiftCards']);

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
