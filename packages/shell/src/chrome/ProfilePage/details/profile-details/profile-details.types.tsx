import { z } from 'zod';
import {
  cleanProfileLinks,
  makeProfileBioSchema,
  makeProfileLinksSchema,
  makeProfileNameSchemas,
  type Translate,
} from '@duncit/forms/schemas';
import type { ShellUser } from '../../../user-display';
import type { ProfileDetails } from '../../queries';

/**
 * The portal profile's edit contract — the same name, bio and link rules mWeb
 * enforces, from @duncit/forms, so a profile saved on one surface is never
 * refused by the other. The photo is an ImageKit URL, or '' for none.
 */
export function makeProfileDetailsSchema(t: Translate) {
  return z.object({
    ...makeProfileNameSchemas(t),
    profile_photo: z.string(),
    bio: makeProfileBioSchema(t),
    profile_links: makeProfileLinksSchema(t),
  });
}

export type ProfileDetailsValues = z.infer<ReturnType<typeof makeProfileDetailsSchema>>;

/** The form's starting values, from the session user plus the details query.
 * One blank link row when there are none, so the first one can be typed. */
export function profileDetailsDefaults(
  user: ShellUser,
  details: ProfileDetails | null,
): ProfileDetailsValues {
  const links = details?.profile_links ?? [];
  return {
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    profile_photo: user?.profile_photo ?? '',
    bio: details?.bio ?? '',
    profile_links: links.length ? links.map(({ label, url }) => ({ label, url })) : [{ label: '', url: '' }],
  };
}

/** The `updateMyProfile` input — blank link rows dropped, '' photo cleared. */
export function buildProfileDetailsInput(values: ProfileDetailsValues) {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    bio: values.bio,
    profile_photo: values.profile_photo || null,
    profile_links: cleanProfileLinks(values.profile_links),
  };
}
