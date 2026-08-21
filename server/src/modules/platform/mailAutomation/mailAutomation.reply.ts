import { logs } from '@observability/log';
import { resolvePrompt, type ResolvedPrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import type { IMailAutomationAccount } from './mailAutomation.model';

/**
 * What the mailbox actually says back.
 *
 * Two layers, and the order matters. The operator's template is the CONTRACT —
 * it holds the reference number and the response window, and it is what Support
 * signed off on. OpenAI then rewrites it into something that reads like a reply
 * to the email in front of it rather than a form letter.
 *
 * The rendered template is therefore also what goes out when the model is off,
 * unconfigured or unreachable. That is not a second code path bolted on for
 * safety: it is the same message, minus the polish. Silence would be the wrong
 * answer to "the rewriter is down", because the sender is owed the ticket
 * number either way.
 */

export interface ReplyContext {
  ticketNo: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  bodyText: string;
}

export interface ComposedReply {
  text: string;
  byAi: boolean;
}

/** "24-48 hours", or "24 hours" when the two ends are the same. */
export function slaLabel(minHours: number, maxHours: number): string {
  const low = Math.min(minHours, maxHours);
  const high = Math.max(minHours, maxHours);
  const unit = high === 1 ? 'hour' : 'hours';
  return low === high ? `${high} ${unit}` : `${low}-${high} ${unit}`;
}

/** The placeholders an operator may use in the template, resolved. */
export function templateVariables(
  account: Pick<IMailAutomationAccount, 'email' | 'sla_min_hours' | 'sla_max_hours'>,
  context: ReplyContext
): Record<string, string> {
  return {
    ticket_no: context.ticketNo,
    sla: slaLabel(account.sla_min_hours, account.sla_max_hours),
    sla_min_hours: String(account.sla_min_hours),
    sla_max_hours: String(account.sla_max_hours),
    sender_name: context.senderName || context.senderEmail,
    sender_email: context.senderEmail,
    subject: context.subject,
    mailbox: account.email,
  };
}

/** `{{name}}` → value. An unknown placeholder is left standing rather than
 * blanked, so a typo in the template is visible in the test send instead of
 * quietly deleting a sentence. */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replaceAll(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) =>
    Object.hasOwn(variables, name) ? variables[name] : whole
  );
}

async function openAiChat(system: ResolvedPrompt, user: string, detail: string): Promise<string> {
  const res = await openaiChat({
    task: 'support.mail_reply',
    detail,
    model: system.model,
    temperature: 0.4,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user },
    ],
  });
  // The caller treats a throw as "use the rendered template instead", so the
  // unconfigured case must keep raising rather than returning empty text.
  if (!res.ok) throw new Error(res.message);
  return res.content.trim();
}

/**
 * A rewrite is only usable if it still carries the reference number — that is
 * the one thing the sender needs from this email. A model that dropped it has
 * not written a better message, it has written the wrong one.
 */
function keepsReference(text: string, ticketNo: string): boolean {
  return ticketNo === '' || text.includes(ticketNo);
}

export async function composeReply(
  account: IMailAutomationAccount,
  context: ReplyContext
): Promise<ComposedReply> {
  const variables = templateVariables(account, context);
  const rendered = renderTemplate(account.reply_template, variables);
  if (!account.ai_enabled) return { text: rendered, byAi: false };

  try {
    const system = await resolvePrompt('support.mail_auto_reply', {
      ticket_no: variables.ticket_no,
      sla: variables.sla,
      mailbox: variables.mailbox,
      template: rendered,
    });
    const user = await resolvePrompt('support.mail_auto_reply.user', {
      sender_name: context.senderName || context.senderEmail,
      sender_email: context.senderEmail,
      subject: context.subject,
      body: context.bodyText.slice(0, 4000),
    });
    const text = await openAiChat(system, user.content, account.email);
    if (!keepsReference(text, variables.ticket_no)) {
      logs.server.warn('mail-automation', 'composeReply', {
        msg: 'AI reply dropped the ticket reference; sending the operator template instead',
        mailbox: account.email,
      });
      return { text: rendered, byAi: false };
    }
    return { text, byAi: true };
  } catch (error) {
    logs.server.warn('mail-automation', 'composeReply', {
      error,
      msg: 'AI rewrite unavailable; sending the operator template as written',
      mailbox: account.email,
    });
    return { text: rendered, byAi: false };
  }
}

/**
 * A preview for the Support portal's step 2, so the operator can read what a
 * sender would get before saving. Same composer, sample context.
 */
export function previewReply(
  account: IMailAutomationAccount,
  sample: Partial<ReplyContext> = {}
): Promise<ComposedReply> {
  return composeReply(account, {
    ticketNo: sample.ticketNo ?? 'ST-PREVIEW',
    senderName: sample.senderName ?? 'Asha',
    senderEmail: sample.senderEmail ?? 'asha@example.com',
    subject: sample.subject ?? 'Refund for a pod I could not attend',
    bodyText:
      sample.bodyText ??
      'Hi team, I booked a pod last Saturday but could not attend because the venue was closed. Can I get a refund? Thanks, Asha',
  });
}
