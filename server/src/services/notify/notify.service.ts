import { logs } from '@observability/log';
import { whatsappService, type WaSendInput, type WaSendOutcome } from '@modules/platform/whatsapp/whatsapp.service';
import { applyVars } from '@modules/content/emailTemplate/emailTemplate.service';
import { sendEmail, type SendResult } from '@services/email/email.service';
import { EMAIL_BY_WA_EVENT } from '@services/email/catalogue';

/**
 * ONE call for a domain event that reaches a person on both channels.
 *
 * Every scenario in `WA_EVENTS` was already wired at the moment it happens —
 * the pod filled, the slot decided, the payout approved — and every one of them
 * was WhatsApp-only. A person with no number, or one who never opted in, got
 * nothing at all; and WhatsApp is the channel that silently stops working when
 * somebody changes phone.
 *
 * The obvious way to add the email leg would be forty `sendEmail` calls beside
 * the forty `whatsappService.send` calls, each rebuilding the same values under
 * different names. That is the duplication rule 34 exists to stop, and it is
 * how the two channels end up disagreeing about what a pod is called.
 *
 * So the values are passed ONCE. The catalogue row for an event lists its email
 * variables in the SAME ORDER as the WhatsApp event's `params`, so the array a
 * call site already builds names itself:
 *
 *   params: [hostName, podTitle, date, time, podUrl, clubAdmin]
 *   vars:   { name, pod, date, time, pod_url, club_admin }
 *
 * Anything the email says that WhatsApp cannot — a deep link, an order number —
 * is passed as `vars` and merged on top.
 *
 * NEITHER LEG THROWS, and neither can stop the other. `whatsappService.send`
 * already returns its outcome as a value, and `sendEmail` files a row for every
 * outcome including the ones that never reached a mail server. A pod
 * cancellation moves money before it tells anybody, so a messaging failure must
 * not take the mutation down with it.
 */

export interface NotifyInput extends WaSendInput {
  /**
   * Where the email leg goes.
   *
   * Omitted falls back to `user.auth.email`, which most call sites already have
   * in hand — the account was loaded for the WhatsApp number. Two things to
   * know: the projection has to SELECT `auth.email` (a narrower one silently
   * yields no address, exactly as a missing `auth.phone` silently yields no
   * number), and a partner contact that is not a Duncit account has to pass the
   * address explicitly because there is no account to read it off.
   *
   * Blank on both sends WhatsApp only.
   */
  email?: string | null;
  /**
   * Email-only variables, merged over the ones derived from `params`. Use it
   * for anything the WhatsApp template has no placeholder for, and to override
   * a positional value the email wants to say differently.
   */
  vars?: Record<string, string>;
}

export interface NotifyOutcome {
  wa: WaSendOutcome;
  /** Null when there was no address, or no email in the catalogue for it. */
  mail: SendResult | null;
}

/** Positional values, named by the catalogue row that mirrors this event. */
function varsFrom(
  keys: readonly string[],
  params: readonly (string | number | null | undefined)[]
): Record<string, string> {
  const out: Record<string, string> = {};
  keys.forEach((key, index) => {
    out[key] = String(params[index] ?? '');
  });
  return out;
}

/**
 * The email leg, or null when there is nothing to send.
 *
 * Guarded whole: a lookup or a render inside `sendEmail` can throw on a
 * database outage, and the WhatsApp message must still go out. The reason is
 * logged rather than swallowed — an email nobody received and nobody can
 * explain is the exact failure the email log was built for.
 */
/** The address on the account the WhatsApp leg was already given. */
const accountEmail = (user: Record<string, any> | null | undefined): string =>
  String(user?.auth?.email ?? '');

async function mailLeg(input: NotifyInput): Promise<SendResult | null> {
  const to = (input.email ?? accountEmail(input.user)).trim();
  if (!to) return null;
  const def = EMAIL_BY_WA_EVENT.get(input.event);
  if (!def) return null;

  const vars = {
    ...varsFrom(
      def.vars.map((variable) => variable.key),
      input.params
    ),
    ...input.vars,
  };
  try {
    return await sendEmail({
      to,
      // The STORED template's subject wins inside sendEmail; this is what a
      // disk-fallback render falls back to, and it carries `{{ }}` of its own,
      // so it is filled here rather than shipped with braces in it.
      subject: applyVars(def.subject, vars),
      template: def.slug,
      category: def.category,
      vars,
    });
  } catch (error) {
    logs.server.error('notify', 'mail', { error, event: input.event, template: def.slug });
    return null;
  }
}

/**
 * Send a domain event on both channels.
 *
 * The two run together rather than one after the other: they share no state,
 * and a slow SMTP handshake should not hold up a WhatsApp message about a pod
 * starting in an hour.
 */
export async function notifyEvent(input: NotifyInput): Promise<NotifyOutcome> {
  const { email, vars, ...wa } = input;
  const [waOutcome, mail] = await Promise.all([
    whatsappService.send(wa),
    mailLeg({ ...wa, email, vars }),
  ]);
  return { wa: waOutcome, mail };
}

/**
 * A fan-out, one recipient at a time.
 *
 * Sequential for the reason `whatsappService.sendEach` is: AiSensy rate-limits
 * the campaign API and there is no limiter anywhere in the server, so a
 * forty-attendee cancellation fired through `Promise.all` is forty concurrent
 * POSTs. The email leg rides the same loop rather than racing ahead of it.
 */
export async function notifyEach(inputs: readonly NotifyInput[]): Promise<NotifyOutcome[]> {
  const outcomes: NotifyOutcome[] = [];
  for (const input of inputs) {
    // eslint-disable-next-line no-await-in-loop
    outcomes.push(await notifyEvent(input));
  }
  return outcomes;
}
