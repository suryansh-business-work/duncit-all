import { z } from 'zod';
import type { LiteMe } from '../../../../shared/graphql/documents';
import type { LiteProfileInput } from '../../../graphql/profile';
import { rules, type Translate } from '../../../lib/validation';

export { SOCIAL_FIELDS } from '../../../lib/social';

export const makeProfileSchema = (t: Translate) =>
  z.object({
    name: rules.required(t, 80),
    handle: rules.handle(t),
    bio: rules.optional(t, 500),
    avatar_url: rules.optionalUrl(t),
    social: z.object({
      instagram: rules.socialHandle(t),
      x: rules.socialHandle(t),
      youtube: rules.socialHandle(t),
      tiktok: rules.socialHandle(t),
      linkedin: rules.socialHandle(t),
      website: rules.optionalUrl(t),
    }),
  });

export type ProfileValues = z.input<ReturnType<typeof makeProfileSchema>>;
export type ProfileOutput = z.output<ReturnType<typeof makeProfileSchema>>;

export const profileDefaults = (me: LiteMe): ProfileValues => ({
  name: me.name,
  handle: me.handle,
  bio: me.bio ?? '',
  avatar_url: me.avatar_url ?? '',
  social: { ...me.social },
});

export const toProfileInput = (values: ProfileOutput): LiteProfileInput => ({ ...values });
