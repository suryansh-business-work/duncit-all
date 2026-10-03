import { z } from 'zod';
import { PERSON_NAME } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * The longest bio a profile keeps — the server's own ceiling
 * (`updateMyProfileSchema.bio` in `profile.validator.ts`). mWeb's Edit profile,
 * mWeb's /profile description and the native Edit profile each allowed their
 * own number, so a bio typed on one could be refused, or cut short, on another.
 */
export const PROFILE_BIO_MAX_LENGTH = 500;

/** The server's ceilings for a name box (`updateMyProfileSchema`). */
export const PROFILE_NAME_MAX_LENGTH = 60;

/** How many profile links an account keeps, and how long one label may be —
 * `profileLinkSchema` + `maxItems(5)` in the server's profile validator. */
export const PROFILE_LINKS_MAX = 5;
export const PROFILE_LINK_LABEL_MAX_LENGTH = 40;

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

/**
 * First and last name, as every profile editor validates them: the shared
 * PERSON_NAME shape signup runs, so an edit cannot save a name signup would
 * have refused. The first name is required; the last may be left empty.
 */
export function makeProfileNameSchemas(t: Translate) {
  const tooLong = t('mweb.accountEdit.validation.nameTooLong', {
    vars: { max: PROFILE_NAME_MAX_LENGTH },
  });
  return {
    first_name: z
      .string()
      .trim()
      .min(1, t('mweb.accountEdit.validation.firstNameRequired'))
      .max(PROFILE_NAME_MAX_LENGTH, tooLong)
      .refine((v) => PERSON_NAME.test(v), {
        message: t('mweb.accountEdit.validation.firstNamePattern'),
      }),
    last_name: z
      .string()
      .trim()
      .max(PROFILE_NAME_MAX_LENGTH, tooLong)
      .refine((v) => v === '' || PERSON_NAME.test(v), {
        message: t('mweb.accountEdit.validation.lastNamePattern'),
      }),
  };
}

/**
 * The profile links list — a website or social account, each a label + URL.
 *
 * A row left completely blank is not a link at all (the form drops it on save),
 * so it must not block Save; a half-filled row still needs both halves. Checked
 * on the row rather than by filtering first, so each message stays on the row
 * that earned it.
 */
export function makeProfileLinksSchema(t: Translate) {
  const link = z
    .object({
      label: z
        .string()
        .trim()
        .max(
          PROFILE_LINK_LABEL_MAX_LENGTH,
          t('mweb.accountEdit.validation.linkLabelTooLong', {
            vars: { max: PROFILE_LINK_LABEL_MAX_LENGTH },
          }),
        ),
      url: z.string().trim(),
    })
    .superRefine((row, ctx) => {
      if (!row.label && !row.url) return;
      if (!row.label) {
        ctx.addIssue({
          code: 'custom',
          path: ['label'],
          message: t('mweb.accountEdit.validation.linkLabelRequired'),
        });
      }
      if (!row.url) {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message: t('mweb.accountEdit.validation.linkUrlRequired'),
        });
        return;
      }
      if (!z.url().safeParse(row.url).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message: t('mweb.accountEdit.validation.linkUrlInvalid'),
        });
      }
    });
  return z
    .array(link)
    .max(
      PROFILE_LINKS_MAX,
      t('mweb.accountEdit.validation.linksMax', { vars: { max: PROFILE_LINKS_MAX } }),
    );
}

/** What a saved link list looks like — blank rows dropped, both halves trimmed. */
export function cleanProfileLinks(
  links: ReadonlyArray<{ label: string; url: string }>,
): { label: string; url: string }[] {
  return links
    .map((row) => ({ label: row.label.trim(), url: row.url.trim() }))
    .filter((row) => row.label && row.url);
}
