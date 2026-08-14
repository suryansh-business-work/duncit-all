import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { listCampaigns, listTemplates, type AisensyTemplate } from '@modules/platform/aisensy/aisensy.project';
import type { CampaignButton, CampaignMedia } from '@modules/platform/aisensy/aisensy.gateway';
import { toButtons, toMedia } from '@modules/platform/aisensy/aisensy.service';
import { getWaPricing, ratePerMessage, toTemplateCategory } from './waPricing.model';

/**
 * What the template behind a campaign requires, and whether a send satisfies it.
 *
 * A WhatsApp template message is billed per recipient, so every requirement it
 * has must be settled ONCE, before the walk starts — not discovered on message
 * one of twenty thousand. Three of them are invisible in the send payload
 * itself: how many variables the body takes, whether a header asset has to
 * travel with it, and whether a CTA link has a {{n}} to fill.
 */
const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

export interface ResolvedCampaign {
  /** Whether AiSensy itself returned a campaign by that name. */
  known: boolean;
  template_name: string;
  template_category: string;
  msg_rate: number;
  /** The template in full, or null when the Project API could not be read. */
  template: AisensyTemplate | null;
  /** The asset attached to the campaign in the AiSensy console, or null. */
  media: CampaignMedia | null;
}

/**
 * The template this campaign sends, what a message on it costs, and whether
 * AiSensy has the campaign at all.
 *
 * Best effort on purpose: the Project API is a second credential the send
 * itself does not need, so a console that cannot read it still sends — the
 * campaign just records no category and no rate, and the saved name list is
 * left to vouch for the name.
 */
export async function resolveCampaign(waCampaignName: string): Promise<ResolvedCampaign> {
  const pricing = await getWaPricing();
  try {
    const [campaigns, templates] = await Promise.all([listCampaigns(), listTemplates()]);
    const campaign = campaigns.find((row) => row.name === waCampaignName) ?? null;
    const template = templates.find((row) => row.name === campaign?.template_name) ?? null;
    const category = toTemplateCategory(template?.category) ?? '';
    return {
      known: !!campaign,
      template_name: template?.name ?? campaign?.template_name ?? '',
      template_category: category,
      msg_rate: ratePerMessage(pricing, category),
      template,
      // The asset lives on the CAMPAIGN, put there when it was built in the
      // console — there is no API that attaches one — and the send endpoint
      // then demands it on every message.
      media: campaign?.media_url
        ? { url: campaign.media_url, filename: campaign.media_filename }
        : null,
    };
  } catch (e) {
    logs.server.warn('waCampaign', 'resolveCampaign', {
      error: e,
      wa_campaign_name: waCampaignName,
    });
    return { known: false, template_name: '', template_category: '', msg_rate: 0, template: null, media: null };
  }
}

/** Everything a send carries beyond its variables, resolved once and frozen. */
export interface SendExtras {
  media: CampaignMedia | null;
  buttons: CampaignButton[];
}

export interface ExtrasInput {
  template_params: string[];
  media?: unknown;
  buttons?: unknown;
}

/** The message a wrong number of variables gets. AiSensy refuses the send
 * outright ("Template param count mismatch!") — and where it does not, the
 * recipient reads a literal `{{7}}` in a message that was still billed. */
function arityError(template: AisensyTemplate, given: number): string {
  return `"${template.name}" takes ${template.param_count} variable(s) and this send fills ${given}. Match the template before sending.`;
}

/**
 * What this send actually carries, checked against the template AiSensy has
 * right now.
 *
 * Nothing is checked when the template could not be read: the send does not
 * need the Project API, and a credential that is missing must not stop a
 * campaign that would otherwise go out.
 */
export function sendExtras(resolved: ResolvedCampaign, input: ExtrasInput): SendExtras {
  // A caller's own asset wins over the one the campaign was built with — the
  // same order the transactional path uses (whatsapp.service dispatch).
  const media = toMedia(input.media) ?? resolved.media;
  const buttons = toButtons(input.buttons);
  const template = resolved.template;
  if (!template) return { media, buttons };

  if (template.param_count !== input.template_params.length) {
    throw badInput(arityError(template, input.template_params.length));
  }
  if (template.needs_media && !media) {
    throw badInput(
      `"${template.name}" needs a header ${template.header_format.toLowerCase()}. Add its public URL, or attach one to the campaign in AiSensy.`
    );
  }
  const filled = new Set(buttons.map((button) => button.index));
  const missing = template.cta_buttons.findIndex(
    (button, index) => button.url_param > 0 && !filled.has(index)
  );
  if (missing >= 0) {
    throw badInput(
      `The "${template.cta_buttons[missing].text}" button's link needs a value — without it the link opens with a {{n}} in it.`
    );
  }
  return { media, buttons };
}
