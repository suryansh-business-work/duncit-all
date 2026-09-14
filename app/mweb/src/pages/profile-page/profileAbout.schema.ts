import { z } from 'zod';
import { makeProfileBioSchema } from '@duncit/forms/schemas';
import { fallbackT } from '../../i18n/fallback';

/**
 * One link row. A row left completely blank is not a link at all — the form
 * drops it on save — so it must not block Save either; a half-filled row still
 * needs both halves. Checked on the row (not by filtering the array first) so
 * each message stays on the row that earned it.
 */
const profileLinkSchema = z
  .object({
    label: z.string().trim().max(40),
    url: z.string().trim(),
  })
  .superRefine((link, ctx) => {
    if (!link.label && !link.url) return;
    if (!link.label) ctx.addIssue({ code: 'custom', path: ['label'], message: 'Label is required' });
    if (!link.url) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'URL is required' });
      return;
    }
    if (!z.url().safeParse(link.url).success) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'Enter a valid URL' });
    }
  });

export const profileSchema = z.object({
  bio: makeProfileBioSchema(fallbackT),
  profile_links: z.array(profileLinkSchema).max(5, 'Add up to 5 links'),
});

export type ProfileAboutValues = z.infer<typeof profileSchema>;
