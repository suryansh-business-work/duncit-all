/**
 * The @handle a profile is shared as — the part mWeb and the native app share.
 *
 * A handle is MINTED BY THE SERVER, once, from the person's name (see
 * `server/src/modules/access/user/username.ts`). Nobody types one: there is no
 * field for it, no availability check and no save. That is deliberate — a
 * handle is the account's address, it is baked into every share link already
 * in circulation, and a settings screen that invites somebody to change it
 * invites them to break their own links.
 *
 * What is left on the client is therefore the LINK, not the handle: where it
 * lives (the profile itself, beside the name it belongs to) and the two words
 * on the button that copies it. Rule 27 keeps the two apps identical and rule
 * 40 keeps the logic here rather than twice.
 */

/** The shareable profile URL for a handle. */
export const profileUrl = (origin: string, handle: string): string => `${origin}/u/${handle}`;

export type UsernameTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface UsernameLabels {
  /** The `@handle` line, ready to render. */
  handle: (username: string) => string;
  copyLink: string;
  linkCopied: string;
}

/**
 * Every key written out as a literal `t('…')`, because
 * `scripts/verify-translation-keys.mjs` greps source for the literal string —
 * a composed key fails the Shared Gates job as shipped-but-never-rendered.
 */
export function buildUsernameLabels(t: UsernameTranslate): UsernameLabels {
  return {
    handle: (username) => `@${username}`,
    copyLink: t('mweb.account.username.copyLink'),
    linkCopied: t('mweb.account.username.linkCopied'),
  };
}
