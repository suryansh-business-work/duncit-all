import { z } from 'zod';
import type { Translator } from '@duncit/app-settings';
import type { CreateAisensyCampaignInput } from '../../queries';

/** The registered scenarios name their campaigns `pod_reminder_user`,
 * `welcome_to_duncit` — the same shape AiSensy accepts for a template name. */
const NAME_PATTERN = /^[a-z0-9_]+$/;
const NAME_MAX = 120;

/**
 * A campaign is only a name bound to an approved template, so this is the whole
 * form. Messages come from `t` because a Zod message is copy a reader sees
 * (rule 38).
 */
export function createCampaignSchema(t: Translator['t']) {
  const required = (field: string) => t('marketingWhatsapp.errorRequired', { vars: { field } });
  const templateName = t('marketingWhatsapp.templateNameLabel');
  const campaignName = t('marketingWhatsapp.campaignNameLabel');

  return z.object({
    template_name: z.string().trim().min(1, required(templateName)),
    campaign_name: z
      .string()
      .trim()
      .min(1, required(campaignName))
      .max(NAME_MAX, t('marketingWhatsapp.errorTooLong', { vars: { field: campaignName } }))
      .regex(NAME_PATTERN, t('marketingWhatsapp.errorNameFormat')),
  });
}

export type CreateCampaignValues = z.infer<ReturnType<typeof createCampaignSchema>>;

/** Nothing is pre-selected: the template a campaign binds to cannot be changed
 * afterwards, so it is a choice rather than a default to click past. */
export const emptyValues = (): CreateCampaignValues => ({
  template_name: '',
  campaign_name: '',
});

export const toCreateInput = (values: CreateCampaignValues): CreateAisensyCampaignInput => ({
  template_name: values.template_name,
  campaign_name: values.campaign_name,
});
