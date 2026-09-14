import { z } from 'zod';

import type { Translate } from './translate';

/**
 * The longest bio a profile keeps — the server's own ceiling
 * (`updateMyProfileSchema.bio` in `profile.validator.ts`). mWeb's Edit profile,
 * mWeb's /profile description and the native Edit profile each allowed their
 * own number, so a bio typed on one could be refused, or cut short, on another.
 */
export const PROFILE_BIO_MAX_LENGTH = 500;

/** The bio box's rule, with its message — every surface that edits a bio. */
export function makeProfileBioSchema(t: Translate) {
  return z
    .string()
    .trim()
    .max(
      PROFILE_BIO_MAX_LENGTH,
      t('mweb.accountEdit.validation.bioTooLong', { vars: { max: PROFILE_BIO_MAX_LENGTH } }),
    );
}
