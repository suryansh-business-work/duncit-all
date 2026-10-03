import { z } from 'zod';
import { makeProfileBioSchema, makeProfileLinksSchema } from '@duncit/forms/schemas';
import { fallbackT } from '../../i18n/fallback';

/** The bio + links rules, shared with the portals' profile page via
 * @duncit/forms so both refuse the same input with the same sentence. */
export const profileSchema = z.object({
  bio: makeProfileBioSchema(fallbackT),
  profile_links: makeProfileLinksSchema(fallbackT),
});

export type ProfileAboutValues = z.infer<typeof profileSchema>;
