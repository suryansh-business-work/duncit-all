import { logs } from '@observability/log';
import { escapeHtml } from '@utils/html';
import { isWhatsappDestination } from '@utils/phone';
import { getUrlConfigs } from '@config/url-configs';
import { sendHtmlEmail } from '@services/email/email.service';
import { emailTranslationVars, recipientLocale } from '@services/email/email-i18n';
import { mailPreferenceService } from '@modules/content/mailPreference/mailPreference.service';
import { mailPreferenceUrl } from '@modules/content/mailPreference/mailPreference.token';
import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import { waPreferenceAllows } from '@modules/platform/whatsapp/whatsapp.service';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { resolveCampaign, sendExtras } from '../waCampaign.template';
import { marketingWeeklyCap, overMarketingCap } from '../waMarketingCap';
import type { MarketingLeadDoc } from '../leads/marketingLead.model';
import type { OutreachStepDoc } from './outreach.model';
import { fillVars } from './outreach.validate';

/**
 * How each step reaches the lead, through the pipes the rest of the product
 * already sends on: the email service (with its opt-out gate and log), and
 * AiSensy on a campaign the Communications portal made, logged and capped as
 * marketing. Nothing here invents a template or a sender.
 */

/** What a step came to. OPTED_OUT stops the walk; DEFER leaves it for tomorrow without using the step. */
export type StepOutcome =
  | { status: 'SENT' | 'SKIPPED' | 'FAILED'; detail: string; destination: string }
  | { status: 'OPTED_OUT'; detail: string; destination: string }
  | { status: 'DEFER'; detail: string; destination: string };

/** The message log's event key for an outreach send, so the WhatsApp logs can filter them. */
export const WA_OUTREACH_EVENT = 'OUTREACH';

/** Pre-send checks that need no claim: the channel's address, opt-out and the weekly cap. */
export async function precheck(step: OutreachStepDoc, lead: MarketingLeadDoc): Promise<StepOutcome | null> {
  if (step.kind === 'EMAIL') {
    const to = lead.emails?.[0] ?? '';
    if (to && !(await mailPreferenceService.allows(to, 'marketing'))) return { status: 'OPTED_OUT', detail: 'Opted out of marketing email', destination: to };
  }
  if (step.kind === 'WHATSAPP') {
    const to = waDestination(lead);
    if (to && !(await waPreferenceAllows(to, 'marketing'))) return { status: 'OPTED_OUT', detail: 'Opted out of marketing WhatsApp', destination: to };
    if (to && (await overMarketingCap(to, await marketingWeeklyCap()))) {
      return { status: 'DEFER', detail: 'Weekly marketing message limit reached', destination: to };
    }
  }
  return null;
}

/** The first of the lead's numbers WhatsApp can reach; '' when none can. */
export const waDestination = (lead: MarketingLeadDoc): string => (lead.phones ?? []).find(isWhatsappDestination) ?? '';

/** The marketer's text as an email: escaped, in paragraphs, with the recipient's own one-click way out. */
async function emailHtml(text: string, to: string): Promise<string> {
  const [{ appUrl }, vars] = await Promise.all([getUrlConfigs(), recipientLocale(to).then(emailTranslationVars)]);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replaceAll('\n', '<br>')}</p>`)
    .join('');
  const footer = `<p><small>${escapeHtml(vars['t:email.fragment.unsubscribe'] ?? '')} <a href="${escapeHtml(
    mailPreferenceUrl(appUrl, to)
  )}">${escapeHtml(vars['t:email.fragment.unsubscribeLink'] ?? '')}</a></small></p>`;
  return `<div>${paragraphs}${footer}</div>`;
}

export async function sendEmailStep(step: OutreachStepDoc, lead: MarketingLeadDoc, sequenceId: string): Promise<StepOutcome> {
  const to = lead.emails?.[0] ?? '';
  if (!to) return { status: 'SKIPPED', detail: 'The lead has no email address', destination: '' };
  const subject = fillVars(step.subject ?? '', lead);
  const result = await sendHtmlEmail({
    to,
    subject,
    html: await emailHtml(fillVars(step.body ?? '', lead), to),
    category: 'marketing',
    source_detail: `outreach:${sequenceId}`,
  });
  if (result.skipped) {
    const reason = result.reason ?? 'The email was not sent';
    return { status: /opted out/i.test(reason) ? 'OPTED_OUT' : 'FAILED', detail: reason, destination: to };
  }
  return { status: 'SENT', detail: `Email "${subject}" sent`, destination: to };
}

export async function sendWhatsappStep(step: OutreachStepDoc, lead: MarketingLeadDoc, enrollmentId: string): Promise<StepOutcome> {
  const destination = waDestination(lead);
  if (!destination) return { status: 'SKIPPED', detail: 'The lead has no WhatsApp number with a country code', destination: '' };
  const campaign = step.wa_template_key ?? '';
  const resolved = await resolveCampaign(campaign);
  if ((resolved.template?.status ?? '').toUpperCase() !== 'APPROVED') {
    return { status: 'FAILED', detail: `The template behind "${campaign}" is not approved (or could not be checked)`, destination };
  }
  const params = (step.wa_params ?? []).map((param) => fillVars(param, lead));
  const userName = lead.name || 'there';
  const log = {
    event_key: WA_OUTREACH_EVENT,
    campaign,
    category: 'marketing',
    audience: 'LEAD',
    entity_id: enrollmentId,
    destination,
    user_name: userName,
    params,
    template_category: resolved.template_category,
    msg_rate: resolved.msg_rate,
    holds_slot: false,
  };
  const startedAt = Date.now();
  try {
    const extras = sendExtras(resolved, { template_params: params });
    const sent = await aisensyService.send({
      campaign_name: campaign,
      destination,
      user_name: userName,
      template_params: params,
      media: extras.media ?? undefined,
      buttons: extras.buttons,
    });
    await WaMessageLogModel.create({ ...log, status: 'SENT', reason: '', submitted_message_id: sent.submitted_message_id, duration_ms: Date.now() - startedAt });
    return { status: 'SENT', detail: `WhatsApp "${campaign}" sent`, destination };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await WaMessageLogModel.create({ ...log, status: 'FAILED', reason: reason.slice(0, 500), duration_ms: Date.now() - startedAt }).catch((logError: unknown) =>
      logs.server.warn('outreach', 'waLog', { error: logError })
    );
    return { status: 'FAILED', detail: reason, destination };
  }
}
