import { z } from 'zod';

const httpUrl = z
  .string()
  .trim()
  .default('')
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Link must be a valid http(s) URL');

export const profileLinkSchema = z.object({
  label: z.string().trim().max(40, 'Label must be 40 characters or fewer').default(''),
  url: httpUrl,
});

export const profileAboutFormSchema = z.object({
  bio: z.string().trim().max(500, 'Bio must be 500 characters or fewer').default(''),
  links: z.array(profileLinkSchema).max(10, 'You can add up to 10 links').default([]),
});

export type ProfileLinkValues = z.infer<typeof profileLinkSchema>;
export type ProfileAboutFormValues = z.infer<typeof profileAboutFormSchema>;

export function toProfileAboutInput(values: ProfileAboutFormValues) {
  const links = values.links.map((link) => ({ label: link.label.trim(), url: link.url.trim() }));
  return {
    bio: values.bio.trim() || null,
    profile_links: links.filter((link) => link.label || link.url),
  };
}
