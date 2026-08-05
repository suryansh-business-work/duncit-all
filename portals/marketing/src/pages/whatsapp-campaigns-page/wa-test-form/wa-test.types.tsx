import { z } from 'zod';
import { PHONE_NUMBER_PATTERN } from '@duncit/forms';

/**
 * One test message. Unlike a campaign there is no audience and no per-recipient
 * variable: every value here is literal, which is the point — it proves the
 * template and the campaign name before an audience is involved.
 */
export const waTestSchema = z.object({
  wa_campaign_name: z.string().trim().min(1, 'Pick a WhatsApp campaign'),
  destination: z
    .string()
    .trim()
    .regex(PHONE_NUMBER_PATTERN, 'Country code + number, digits only (e.g. 919582998897)'),
  user_name: z.string().trim().min(1, 'User name is required'),
  template_params: z.array(
    z.object({ value: z.string().trim().min(1, 'Fill this parameter or remove it') })
  ),
});

export type WaTestValues = z.infer<typeof waTestSchema>;

export interface WaTestInput {
  wa_campaign_name: string;
  destination: string;
  user_name: string;
  template_params: string[];
}

export const emptyValues = (campaignName: string): WaTestValues => ({
  wa_campaign_name: campaignName,
  destination: '',
  user_name: '',
  template_params: [],
});

export const toTestInput = (values: WaTestValues): WaTestInput => ({
  wa_campaign_name: values.wa_campaign_name,
  destination: values.destination.trim(),
  user_name: values.user_name.trim(),
  template_params: values.template_params.map((param) => param.value.trim()),
});
