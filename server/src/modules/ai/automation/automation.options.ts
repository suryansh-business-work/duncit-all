import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import { isAisensyConfigured } from '@modules/platform/aisensy/aisensy.gateway';
import { isProjectApiConfigured, listCampaigns, listTemplates } from '@modules/platform/aisensy/aisensy.project';
import { WaCampaignNameModel } from '@modules/crm/marketing/waCampaignName.model';
import { WA_VARIABLES } from '@modules/crm/marketing/waCampaign.recipients';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import { MailAutomationAccountModel } from '@modules/platform/mailAutomation/mailAutomation.model';
import { AiPromptModel } from '@modules/ai/prompt/prompt.model';
import { detectVariables, emailTemplateService } from '@modules/content/emailTemplate/emailTemplate.service';
import { CHROME_VARS } from '@services/email/catalogue';
import { EMAIL_CATEGORIES } from '@services/email/email.provider';
import type { AutomationChannel } from './automation.model';

/**
 * Everything the builder's step settings pick from, in one read.
 *
 * The AI portal has an AI seat, not a Communications or Tech one, so it cannot
 * ask those consoles' queries for their campaigns, templates and mailboxes.
 * This is the AI portal's own, read-only view of exactly the pieces a flow
 * step needs — names and shapes, never a credential.
 */

export const WHATSAPP_WEBHOOK_PATH = '/automation/whatsapp/inbound';

/** Variables a template must not ask the operator for: sendEmail supplies them. */
const CHROME_KEYS = new Set(CHROME_VARS.map((row) => row.key));

async function whatsappOptions() {
  const [configured, projectConfigured] = await Promise.all([isAisensyConfigured(), isProjectApiConfigured()]);
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = [];
  let templates: Awaited<ReturnType<typeof listTemplates>> = [];
  if (projectConfigured) {
    try {
      [campaigns, templates] = await Promise.all([listCampaigns(), listTemplates()]);
    } catch (error) {
      // The Project API is a second credential; a flow can still name a campaign by hand.
      logs.server.warn('automation', 'options', { error, msg: 'AiSensy Project API could not be read' });
    }
  }
  const [saved, secret, { serverUrl }] = await Promise.all([
    WaCampaignNameModel.find().sort({ name: 1 }).lean(),
    getRuntimeEnvValue('AISENSY_WEBHOOK_SECRET'),
    getUrlConfigs(),
  ]);
  return {
    whatsapp_configured: configured,
    project_configured: projectConfigured,
    campaigns,
    templates,
    saved_campaign_names: saved.map((row: any) => ({ id: String(row._id), name: row.name, description: row.description ?? '' })),
    webhook_url: `${serverUrl.replace(/\/+$/, '')}${WHATSAPP_WEBHOOK_PATH}`,
    webhook_secret_set: Boolean(secret),
  };
}

async function emailOptions() {
  const [entries, templates, mailboxes] = await Promise.all([
    envEntryService.list({ category: 'EMAIL', is_active: true }),
    emailTemplateService.list(),
    MailAutomationAccountModel.find().select('email display_name is_active').sort({ email: 1 }).lean(),
  ]);
  return {
    email_senders: entries.map((entry: any) => ({
      id: String(entry.id ?? entry._id),
      name: entry.name,
      from_address: String((entry.config as Record<string, unknown> | undefined)?.from_address ?? ''),
      is_default: Boolean(entry.is_default),
    })),
    email_templates: templates.map((tpl: any) => {
      const declared: string[] = (tpl.variables ?? []).map((row: { key: string }) => row.key);
      const detected = detectVariables(tpl.mjml ?? '');
      const variables = [...new Set([...declared, ...detected])].filter(
        (key) => !key.startsWith('t:') && !CHROME_KEYS.has(key) && key !== 'name'
      );
      return { slug: tpl.slug, name: tpl.name, subject: tpl.subject, variables };
    }),
    email_categories: [...EMAIL_CATEGORIES],
    mailboxes: mailboxes.map((row: any) => ({
      email: row.email,
      display_name: row.display_name ?? '',
      is_active: row.is_active !== false,
    })),
  };
}

export async function automationOptions(channel: AutomationChannel) {
  const [prompts, channelOptions] = await Promise.all([
    AiPromptModel.find({ is_active: { $ne: false } }).select('name category kind').sort({ kind: 1, name: 1 }).lean(),
    channel === 'WHATSAPP' ? whatsappOptions() : emailOptions(),
  ]);
  return {
    channel,
    variables: WA_VARIABLES.map((row) => ({ name: row.name, description: row.description })),
    prompts: prompts.map((row: any) => ({ id: String(row._id), name: row.name, category: row.category ?? '', kind: row.kind })),
    // Every field the schema declares, whatever the channel — the client reads one shape.
    whatsapp_configured: false,
    project_configured: false,
    campaigns: [],
    templates: [],
    saved_campaign_names: [],
    webhook_url: '',
    webhook_secret_set: false,
    email_senders: [],
    email_templates: [],
    email_categories: [],
    mailboxes: [],
    ...channelOptions,
  };
}
