import { z } from 'zod';
import { PHONE_NUMBER_PATTERN } from '@duncit/forms';
import type { SendAisensyCampaignInput } from '../queries';

/**
 * Advance test parameters. Every field is required and each template parameter
 * row must carry a value — the send stays blocked until they are all filled,
 * because AiSensy renders an empty variable as a blank in the message.
 */
export const campaignTestSchema = z.object({
  campaign_name: z.string().trim().min(1, 'Campaign name is required'),
  destination: z
    .string()
    .trim()
    .regex(PHONE_NUMBER_PATTERN, 'Country code + number, digits only (e.g. 919582998897)'),
  user_name: z.string().trim().min(1, 'User name is required'),
  template_params: z.array(
    z.object({ value: z.string().trim().min(1, 'Fill this parameter or remove it') })
  ),
});

export type CampaignTestValues = z.infer<typeof campaignTestSchema>;

/** One empty parameter row so the template's first variable is visible up front. */
export const emptyValues = (campaign_name: string): CampaignTestValues => ({
  campaign_name,
  destination: '',
  user_name: '',
  template_params: [{ value: '' }],
});

/** Flatten the field-array rows into the ordered [String!]! the mutation takes. */
export const toSendInput = (values: CampaignTestValues): SendAisensyCampaignInput => ({
  campaign_name: values.campaign_name.trim(),
  destination: values.destination.trim(),
  user_name: values.user_name.trim(),
  template_params: values.template_params.map((param) => param.value.trim()),
});
