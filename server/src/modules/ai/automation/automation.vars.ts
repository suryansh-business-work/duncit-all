import { UserModel } from '@modules/access/user/user.model';
import { WA_VARIABLES } from '@modules/crm/marketing/waCampaign.recipients';
import { appDateTime } from '@utils/app-time';
import type { AutomationContact, IAutomationRun } from './automation.model';

/**
 * The variables a step may write `{{like.this}}` into any text field.
 *
 * Two layers: the run's own context (`contact.*`, `message.*`, `flow.name`,
 * `now`) and whatever earlier steps stored (an AI reply, a label, a webhook
 * answer). Both live in one nested object so a dotted path reads either.
 */

const TOKEN_RE = /\{\{\s*([A-Za-z_][\w.]*)\s*\}\}/g;

/** Read `a.b.c` off a nested object; anything missing on the way is ''. */
export function readPath(source: Record<string, unknown>, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value as string | number | boolean);
};

/** `{{name}}` → value. An unknown placeholder is left standing, so a typo is
 * visible in the test transcript rather than silently blanked. */
export function renderVars(template: string, vars: Record<string, unknown>): string {
  return String(template ?? '').replaceAll(TOKEN_RE, (whole, path: string) => {
    const value = readPath(vars, path);
    return value === undefined ? whole : asText(value);
  });
}

/** The same, for a step whose whole value is one variable name (no braces). */
export function readVar(vars: Record<string, unknown>, name: string): string {
  return asText(readPath(vars, name.trim()));
}

/**
 * The recipient variables the marketing campaigns already offer (first_name,
 * city, …), read off the Duncit account that matches the contact — when one
 * does. A contact with no account simply has none of these, and a step that
 * relies on one comes out empty, which the send step then reports.
 */
async function profileVars(contact: AutomationContact): Promise<Record<string, string>> {
  const or: Record<string, unknown>[] = [];
  if (contact.email) or.push({ 'auth.email': contact.email });
  if (contact.phone) {
    const local = contact.phone.slice(-10);
    or.push({ 'communication.whatsapp.number': { $regex: `${local}$` } }, { 'auth.phone.number': { $regex: `${local}$` } });
  }
  if (!or.length) return {};
  const user = await UserModel.findOne({ $or: or })
    .select('profile.first_name profile.last_name profile.city profile.state')
    .lean()
    .catch(() => null);
  if (!user) return {};
  return Object.fromEntries(WA_VARIABLES.map((variable) => [variable.name, variable.value(user as Record<string, any>)]));
}

/** The context a fresh run starts with. */
export async function initialVars(input: {
  flowName: string;
  contact: AutomationContact;
  text: string;
  subject: string;
}): Promise<Record<string, unknown>> {
  const profile = await profileVars(input.contact);
  return {
    ...profile,
    contact: { name: input.contact.name, phone: input.contact.phone, email: input.contact.email },
    message: { text: input.text, subject: input.subject },
    flow: { name: input.flowName },
    now: appDateTime(new Date()),
  };
}

/** A reply from the contact becomes the current message. */
export function withReply(run: IAutomationRun, text: string): Record<string, unknown> {
  const vars = { ...(run.variables ?? {}) } as Record<string, unknown>;
  const message = { ...((vars.message as Record<string, unknown>) ?? {}), text };
  return { ...vars, message, now: appDateTime(new Date()) };
}

const escapeRegex = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** The condition step's test. Text comparisons are case-insensitive. */
export function evaluateCondition(actual: string, operator: string, expected: string): boolean {
  const left = actual.trim().toLowerCase();
  const right = expected.trim().toLowerCase();
  switch (operator) {
    case 'contains':
      return right !== '' && left.includes(right);
    case 'equals':
      return left === right;
    case 'starts_with':
      return right !== '' && left.startsWith(right);
    case 'matches':
      return safeRegex(expected).test(actual);
    case 'is_empty':
      return left === '';
    case 'not_empty':
      return left !== '';
    default:
      return false;
  }
}

/** An operator's regex, or a literal match when the pattern does not compile —
 * a broken pattern must not take the whole flow down. */
function safeRegex(pattern: string): RegExp {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return new RegExp(escapeRegex(pattern), 'i');
  }
}

/** Keyword match for an inbound trigger: any keyword anywhere, case-insensitive. */
export function matchesKeywords(text: string, keywords: string): boolean {
  const words = keywords
    .split(',')
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
  if (!words.length) return true;
  const haystack = text.toLowerCase();
  return words.some((word) => haystack.includes(word));
}

/** Whether a trigger's keyword list is non-empty — a keyworded flow outranks a catch-all. */
export const hasKeywords = (keywords: unknown): boolean =>
  String(keywords ?? '')
    .split(',')
    .some((word) => word.trim() !== '');
