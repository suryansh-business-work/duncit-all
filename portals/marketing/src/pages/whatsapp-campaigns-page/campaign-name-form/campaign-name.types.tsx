import { z } from 'zod';

/** One AiSensy campaign name added to the pickable list. */
export const campaignNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Campaign name is required')
    .max(120, 'Keep the name under 120 characters'),
  description: z.string().trim().max(300, 'Keep the description under 300 characters'),
});

export type CampaignNameValues = z.infer<typeof campaignNameSchema>;

export const emptyValues = (): CampaignNameValues => ({ name: '', description: '' });
