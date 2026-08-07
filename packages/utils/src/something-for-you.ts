/**
 * The rail at the bottom of Home, in the terms all three surfaces share.
 *
 * mWeb draws it in MUI, the native app in Tamagui and the admin panel edits it
 * — three renderers, one set of rules. Only the rules live here: the shape of a
 * card, how long a headline may be, and how many lines it may take. Anything
 * that knows about a view stays with the view (rule 40).
 */

/** One card, exactly as the server returns it. */
export interface SomethingForYouItem {
  id: string;
  title: string;
  image_url: string;
  bottom_text: string;
  /** In-app path, e.g. `/referral`. Empty means the card is decorative. */
  link_path: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Thirty characters, and never more than three lines.
 *
 * The card is a fixed size on both surfaces, so a longer headline is not
 * wrapped — it is cut off. The limit is enforced where the words are typed;
 * these two are what the renderers clamp to when older rows already exceed it.
 */
export const SOMETHING_FOR_YOU_TITLE_MAX = 30;
export const SOMETHING_FOR_YOU_TITLE_LINES = 3;

/**
 * A headline that fits, with an ellipsis when it did not.
 *
 * Cut on a word boundary rather than mid-word when one is close enough to the
 * limit — "Invite Friends. Earn Rewa…" reads as broken, "Invite Friends…" reads
 * as short. The line clamp is the renderer's job; this is the character one.
 */
export function clampSomethingForYouTitle(
  title: string,
  max = SOMETHING_FOR_YOU_TITLE_MAX
): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  // Only honour a word boundary in the last third; earlier than that and the
  // headline loses more than the ellipsis costs.
  const body = lastSpace > max * 0.66 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s.,;:!-]+$/, '')}…`;
}
