import { z } from 'zod';
import type { LiteMe } from '../../../../shared/graphql/documents';
import type { LiteProfileInput } from '../../../graphql/profile';
import { rules, type Translate } from '../../../lib/validation';

export const makeProfileSchema = (t: Translate) =>
  z.object({
    name: rules.required(t, 80),
    handle: rules.handle(t),
    bio: rules.optional(t, 500),
    avatar_url: rules.optionalUrl(t),
    upi_id: rules.optionalUpi(t),
    upi_name: rules.optional(t, 80),
  });

export type ProfileValues = z.infer<ReturnType<typeof makeProfileSchema>>;

export const profileDefaults = (me: LiteMe): ProfileValues => ({
  name: me.name,
  handle: me.handle,
  bio: me.bio ?? '',
  avatar_url: me.avatar_url ?? '',
  upi_id: me.upi_id ?? '',
  upi_name: me.upi_name ?? '',
});

export const toProfileInput = (values: ProfileValues): LiteProfileInput => ({ ...values });
