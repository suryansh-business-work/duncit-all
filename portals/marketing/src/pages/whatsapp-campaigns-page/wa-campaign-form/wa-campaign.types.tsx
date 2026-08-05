import { z } from 'zod';

/**
 * A WhatsApp send. The message body is not here — it lives in the approved
 * template on AiSensy; this form only picks the template, the audience, and
 * what fills the template's variables.
 */
export const waCampaignSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Give this campaign a name of at least 3 characters')
      .max(120, 'Keep the name under 120 characters'),
    wa_campaign_name: z.string().trim().min(1, 'Pick a WhatsApp campaign name'),
    audience: z.enum(['ALL_USERS', 'AUDIENCE_LIST']),
    audience_list_id: z.string().trim(),
    template_params: z.array(
      z.object({ value: z.string().trim().min(1, 'Fill this parameter or remove it') })
    ),
    /** ISO time to send at; empty sends as soon as it is submitted. */
    scheduled_at: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.audience === 'AUDIENCE_LIST' && !values.audience_list_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['audience_list_id'],
        message: 'Pick the audience list to send to',
      });
    }
    // A time already gone would send immediately, which is not what picking a
    // time means — say so rather than sending.
    if (values.scheduled_at && new Date(values.scheduled_at).getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scheduled_at'],
        message: 'Pick a time in the future',
      });
    }
  });

export type WaCampaignValues = z.infer<typeof waCampaignSchema>;

export interface SendWaCampaignInput {
  name: string;
  wa_campaign_name: string;
  audience: string;
  audience_list_id: string | null;
  template_params: string[];
  scheduled_at: string | null;
}

/** No parameter rows to start with: how many a send needs is decided by the
 * WhatsApp template that was picked, so the marketer adds exactly those. */
export const emptyValues = (): WaCampaignValues => ({
  name: '',
  wa_campaign_name: '',
  audience: 'ALL_USERS',
  audience_list_id: '',
  template_params: [],
  scheduled_at: '',
});

/** The form values that repeat a past send: same template, same audience, same
 * params — never its schedule, which belonged to that run. */
export const valuesFromCampaign = (campaign: {
  name: string;
  wa_campaign_name: string;
  audience: string;
  audience_list_id: string | null;
  template_params: string[];
}): WaCampaignValues => ({
  name: `${campaign.name} (copy)`,
  wa_campaign_name: campaign.wa_campaign_name,
  audience: campaign.audience === 'AUDIENCE_LIST' ? 'AUDIENCE_LIST' : 'ALL_USERS',
  audience_list_id: campaign.audience_list_id ?? '',
  template_params: campaign.template_params.map((value) => ({ value })),
  scheduled_at: '',
});

export const toSendInput = (values: WaCampaignValues): SendWaCampaignInput => ({
  name: values.name.trim(),
  wa_campaign_name: values.wa_campaign_name,
  audience: values.audience,
  audience_list_id: values.audience === 'AUDIENCE_LIST' ? values.audience_list_id : null,
  template_params: values.template_params.map((param) => param.value.trim()),
  scheduled_at: values.scheduled_at || null,
});
