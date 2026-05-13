import * as yup from 'yup';

const httpUrl = yup
  .string()
  .trim()
  .default('')
  .test('http-url', 'Link must be a valid http(s) URL', (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });

export const profileLinkSchema = yup.object({
  label: yup.string().trim().max(40, 'Label must be 40 characters or fewer').default(''),
  url: httpUrl,
});

export const profileAboutFormSchema = yup.object({
  bio: yup.string().trim().max(500, 'Bio must be 500 characters or fewer').default(''),
  links: yup.array(profileLinkSchema).max(10, 'You can add up to 10 links').default([]),
});

export type ProfileLinkValues = yup.InferType<typeof profileLinkSchema>;
export type ProfileAboutFormValues = yup.InferType<typeof profileAboutFormSchema>;

export function toProfileAboutInput(values: ProfileAboutFormValues) {
  const cast = profileAboutFormSchema.cast(values, { stripUnknown: true });
  return {
    bio: cast.bio || null,
    profile_links: (cast.links ?? []).filter((link) => link.label || link.url),
  };
}
