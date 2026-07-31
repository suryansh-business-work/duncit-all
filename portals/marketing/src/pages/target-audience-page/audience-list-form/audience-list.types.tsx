import { z } from 'zod';

/**
 * Step 2 of the create wizard. Name and owner identify the list everywhere it
 * is used later, so both are required; the description is optional but capped
 * to keep the lists table readable.
 */
export const audienceListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the list a name')
    .max(120, 'Keep the name under 120 characters'),
  description: z.string().trim().max(500, 'Keep the description under 500 characters'),
  owner: z
    .string()
    .trim()
    .min(1, 'Every list needs an owner')
    .max(120, 'Keep the owner under 120 characters'),
});

export type AudienceListFormValues = z.infer<typeof audienceListSchema>;

export const emptyAudienceList = (owner = ''): AudienceListFormValues => ({
  name: '',
  description: '',
  owner,
});
