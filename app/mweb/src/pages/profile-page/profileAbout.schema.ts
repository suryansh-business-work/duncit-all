import { z } from 'zod';

export const profileSchema = z.object({
  bio: z.string().max(500, 'Description must be 500 characters or fewer'),
  profile_links: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Label is required').max(40),
        url: z.string().trim().min(1, 'URL is required').url('Enter a valid URL'),
      })
    )
    .max(5, 'Add up to 5 links'),
});

export type ProfileAboutValues = z.infer<typeof profileSchema>;
