import { logs } from '@observability/log';
import { isWhatsappDestination } from '@utils/phone';
import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import type { AisensyTemplate } from '@modules/platform/aisensy/aisensy.project';
import { resolveCampaign } from '@modules/crm/marketing/waCampaign.template';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { emailTemplateService } from '@modules/content/emailTemplate/emailTemplate.service';
import { sendHtmlEmail } from '@services/email/email.service';
import { EMAIL_CATEGORIES, type EmailCategory } from '@services/email/email.provider';
import { renderVars } from './automation.vars';
import type { StepContext, StepResult } from './automation.types';

/**
 * The two steps that reach a person.
 *
 * Both preview in a test run and deliver in a live one, through the SAME
 * rendering: a test shows exactly the message a live run would send, filled
 * from the same variables, and the only thing the mode changes is whether the
 * result is handed to AiSensy or SMTP.
 */

/** The message log's event key for a flow send — one key, so the WhatsApp Logs
 * console can filter every automation message in one click. */
export const WA_AUTOMATION_EVENT = 'AUTOMATION';

const str = (v: unknown): string => String(v ?? '').trim();
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str) : []);

/** The template body as WhatsApp would draw it, with the values in place. */
export function previewTemplate(template: AisensyTemplate | null, params: string[]): string {
  if (!template) return params.join('\n');
  const body = template.body.replaceAll(/\{\{(\d+)\}\}/g, (whole, n: string) => params[Number(n) - 1] ?? whole);
  return [template.header, body, template.footer].filter(Boolean).join('\n\n');
}

interface RenderedButtons {
  index: number;
  value: string;
}

function renderButtons(raw: unknown, vars: Record<string, unknown>): RenderedButtons[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((row) => ({ index: Number(row?.index ?? 0) || 0, value: renderVars(str(row?.value), vars) }))
    .filter((row) => row.value);
}

export async function sendWhatsappStep(ctx: StepContext): Promise<StepResult> {
  const { node, vars, run } = ctx;
  const campaignName = str(node.data.campaign_name);
  const destination = run.contact.phone;
  if (!isWhatsappDestination(destination)) {
    return { handle: 'next', status: 'SKIPPED', detail: 'The contact has no valid WhatsApp number' };
  }
  const params = list(node.data.template_params).map((param) => renderVars(param, vars));
  const blank = params.findIndex((param) => !param);
  if (blank >= 0) {
    return { handle: 'next', status: 'SKIPPED', detail: `Template variable ${blank + 1} came out empty` };
  }

  const resolved = await resolveCampaign(campaignName);
  const mediaUrl = renderVars(str(node.data.media_url), vars);
  const media = mediaUrl ? { url: mediaUrl, filename: str(node.data.media_filename) } : resolved.media ?? undefined;
  const buttons = renderButtons(node.data.buttons, vars);
  const text = previewTemplate(resolved.template, params);
  const message = {
    direction: 'OUT' as const,
    kind: 'whatsapp_template',
    text,
    subject: '',
    html: '',
    template_name: resolved.template_name || campaignName,
    buttons: resolved.template?.buttons ?? [],
    delivered: false,
  };
  if (!ctx.live) {
    return { handle: 'next', status: 'OK', detail: `Previewed campaign "${campaignName}" (not sent)`, message };
  }

  const startedAt = Date.now();
  const log = {
    event_key: WA_AUTOMATION_EVENT,
    campaign: campaignName,
    category: 'automation',
    audience: 'USER',
    entity_id: String(run._id),
    destination,
    user_name: run.contact.name || 'there',
    params,
    media_url: media?.url ?? '',
    media_filename: media?.filename ?? '',
    template_category: resolved.template_category,
    msg_rate: resolved.msg_rate,
    holds_slot: false,
  };
  try {
    const result = await aisensyService.send({
      campaign_name: campaignName,
      destination,
      user_name: run.contact.name || 'there',
      template_params: params,
      media,
      buttons,
    });
    await WaMessageLogModel.create({
      ...log,
      status: 'SENT',
      reason: '',
      submitted_message_id: result.submitted_message_id,
      duration_ms: Date.now() - startedAt,
    }).catch((error) => logs.server.warn('automation', 'waLog', { error }));
    return {
      handle: 'next',
      status: 'OK',
      detail: `Sent via campaign "${campaignName}"`,
      message: { ...message, delivered: true },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await WaMessageLogModel.create({
      ...log,
      status: 'FAILED',
      reason: reason.slice(0, 500),
      duration_ms: Date.now() - startedAt,
    }).catch((logError) => logs.server.warn('automation', 'waLog', { error: logError }));
    return { handle: 'next', status: 'FAILED', detail: reason, message };
  }
}

const isCategory = (value: string): value is EmailCategory => (EMAIL_CATEGORIES as readonly string[]).includes(value);

export async function sendEmailStep(ctx: StepContext): Promise<StepResult> {
  const { node, vars, run } = ctx;
  const to = run.contact.email;
  if (!to) return { handle: 'next', status: 'SKIPPED', detail: 'The contact has no email address' };

  const slug = str(node.data.template_slug);
  const rawVars = (node.data.vars ?? {}) as Record<string, unknown>;
  const templateVars: Record<string, string> = { name: run.contact.name };
  for (const [key, value] of Object.entries(rawVars)) templateVars[key] = renderVars(str(value), vars);

  const rendered = await emailTemplateService.render(slug, templateVars);
  const subject = renderVars(str(node.data.subject), vars) || rendered.subject;
  const rawCategory = str(node.data.category);
  const category: EmailCategory = isCategory(rawCategory) ? rawCategory : 'notification';
  const message = {
    direction: 'OUT' as const,
    kind: 'email',
    text: '',
    subject,
    html: rendered.html,
    template_name: slug,
    buttons: [],
    delivered: false,
  };
  if (rendered.errors.length) {
    return { handle: 'next', status: 'FAILED', detail: `Template "${slug}" did not render: ${rendered.errors[0]}`, message };
  }
  if (!ctx.live) {
    return { handle: 'next', status: 'OK', detail: `Previewed template "${slug}" (not sent)`, message };
  }

  const result = await sendHtmlEmail({
    to,
    subject,
    html: rendered.html,
    category,
    provider_id: str(node.data.sender_id) || null,
    template: slug,
    source_detail: `automation:${String(run.flow_id)}`,
    vars: templateVars,
  });
  if (result.skipped) {
    return { handle: 'next', status: 'FAILED', detail: result.reason ?? 'The email was not sent', message };
  }
  return {
    handle: 'next',
    status: 'OK',
    detail: `Sent "${subject}" through ${result.entryName || 'the default mailbox'}`,
    message: { ...message, delivered: true },
  };
}
