/**
 * The rail at the bottom of Home, in the terms all three surfaces share.
 *
 * mWeb draws it in MUI, the native app in Tamagui and the admin panel edits it
 * — three renderers, one set of rules. Only the rules live here: the shape of a
 * card, how long a headline may be, and how many lines it may take. Anything
 * that knows about a view stays with the view (rule 40).
 */

/**
 * What pressing a card does.
 *
 * Two genuinely different actions, not one with a fallback. A ROUTE stays
 * inside the product — the app pushes a screen, mWeb pushes a history entry —
 * and a URL leaves it, which on a phone means handing over to the browser. The
 * difference is invisible in the stored string (`/referral` and
 * `https://…/referral` look alike to a validator and nothing alike to a user),
 * so the admin says which one they meant rather than the renderer guessing.
 */
export type SomethingForYouAction = 'NONE' | 'ROUTE' | 'URL';

/** One card, exactly as the server returns it. */
export interface SomethingForYouItem {
  id: string;
  title: string;
  image_url: string;
  bottom_text: string;
  action_type: SomethingForYouAction;
  /** In-app path, e.g. `/referral`. Used when action_type is ROUTE. */
  link_path: string;
  /** An address outside the product. Used when action_type is URL. */
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * The in-app destinations an admin may point a card at.
 *
 * A labelled menu, not a copy of a router: mWeb's routes and the app's linking
 * config already hold these paths, but neither holds a name a person would
 * recognise, and neither is reachable from the admin panel. Kept deliberately
 * short — the places a promotion sends somebody — rather than every route that
 * exists. Adding one means adding it here AND confirming both surfaces route
 * it (app/mweb/src/App.tsx, app/mobile-app/src/navigation/linking.ts).
 *
 * The name is a catalogue key, not a word: the picker is a screen an admin
 * reads, so it translates like every other (rule 38). The key is written out
 * in full because `verify-translation-keys.mjs` greps for the literal.
 */
export const SOMETHING_FOR_YOU_ROUTES: readonly { labelKey: string; path: string }[] = [
  { labelKey: 'admin.somethingForYou.routes.home', path: '/' },
  { labelKey: 'admin.somethingForYou.routes.explore', path: '/explore' },
  { labelKey: 'admin.somethingForYou.routes.clubs', path: '/clubs' },
  { labelKey: 'admin.somethingForYou.routes.shop', path: '/shop' },
  { labelKey: 'admin.somethingForYou.routes.cart', path: '/cart' },
  { labelKey: 'admin.somethingForYou.routes.orders', path: '/orders' },
  { labelKey: 'admin.somethingForYou.routes.saved', path: '/saved' },
  { labelKey: 'admin.somethingForYou.routes.podHistory', path: '/pod-history' },
  { labelKey: 'admin.somethingForYou.routes.referral', path: '/referral' },
  { labelKey: 'admin.somethingForYou.routes.duncitCoin', path: '/duncit-coin' },
  { labelKey: 'admin.somethingForYou.routes.earn', path: '/earn' },
  { labelKey: 'admin.somethingForYou.routes.becomeHost', path: '/become-host' },
  { labelKey: 'admin.somethingForYou.routes.createPod', path: '/create-pod' },
  { labelKey: 'admin.somethingForYou.routes.registerVenue', path: '/register-venue' },
  { labelKey: 'admin.somethingForYou.routes.podIdeas', path: '/pod-ideas' },
  { labelKey: 'admin.somethingForYou.routes.feedback', path: '/support/feedback' },
  { labelKey: 'admin.somethingForYou.routes.support', path: '/support' },
  { labelKey: 'admin.somethingForYou.routes.faqs', path: '/faqs' },
  { labelKey: 'admin.somethingForYou.routes.podPlans', path: '/pod-plans' },
  { labelKey: 'admin.somethingForYou.routes.account', path: '/account' },
  { labelKey: 'admin.somethingForYou.routes.profile', path: '/profile' },
];

/**
 * Thirty characters, and never more than three lines.
 *
 * The card is a fixed size on both surfaces, so a longer headline is not
 * wrapped — it is cut off. The limit is enforced where the words are typed;
 * these two are what the renderers clamp to when older rows already exceed it.
 */
export const SOMETHING_FOR_YOU_TITLE_MAX = 30;
export const SOMETHING_FOR_YOU_TITLE_LINES = 3;

/** A card's destination, already decided — the renderers only carry it out. */
export type SomethingForYouTarget =
  | { kind: 'none' }
  | { kind: 'route'; path: string }
  | { kind: 'url'; url: string };

/**
 * What pressing this card should do, resolved once for both surfaces.
 *
 * The two renderers act on it differently — mWeb pushes a history entry or
 * opens a tab, the app pushes a screen or hands over to the browser — but they
 * must not disagree about WHICH of those a card is. A card whose action names a
 * destination it does not carry (URL with no address) resolves to nothing
 * rather than to a button that fails when pressed.
 */
export function resolveSomethingForYouTarget(
  item: Pick<SomethingForYouItem, 'action_type' | 'link_path' | 'link_url'>
): SomethingForYouTarget {
  if (item.action_type === 'ROUTE' && item.link_path) {
    return { kind: 'route', path: item.link_path };
  }
  if (item.action_type === 'URL' && item.link_url) {
    return { kind: 'url', url: item.link_url };
  }
  return { kind: 'none' };
}

/** Characters that read as debris immediately before an ellipsis. */
const TRAILING = new Set([' ', '\t', '\n', '.', ',', ';', ':', '!', '-']);

/**
 * Walk back over the debris rather than matching it.
 *
 * A trailing `[…]+$` pattern backtracks over the whole string on a miss, which
 * is a cost with no upside here: the answer is always the last few characters.
 */
function stripTrailingPunctuation(value: string): string {
  let end = value.length;
  while (end > 0 && TRAILING.has(value.charAt(end - 1))) end -= 1;
  return value.slice(0, end);
}

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
  return `${stripTrailingPunctuation(body)}…`;
}
