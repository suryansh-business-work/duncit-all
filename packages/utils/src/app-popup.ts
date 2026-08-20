/**
 * The app-open marketing popup — the rules the MUI overlay (mWeb) and the
 * Tamagui overlay (native app + native web) both run, so one campaign looks and
 * behaves the same on all three surfaces (rule 27).
 *
 * Two things live here because they are the parts that must never drift:
 *
 * 1. WHICH POPUPS THIS DEVICE HAS ALREADY CLOSED. The server remembers a
 *    dismissal per user, but only after a round trip that can fail, and it
 *    cannot help in the moment before the answer arrives. So the id is written
 *    locally the instant the user closes it. The stored value is a LIST OF
 *    POPUP IDS, never a single "popup seen" flag — marketing publishes a new
 *    campaign by creating a new id, and a global flag would silently swallow
 *    every campaign after the first.
 * 2. HOW BIG THE ART IS DRAWN. Campaign images arrive in whatever aspect the
 *    designer exported, so a fixed box letterboxes one and crops the next, and
 *    both read as a broken ad. The box is derived from the picture's own aspect
 *    instead, which is what lets the card hug the artwork everywhere.
 */

/** Where the closed popup ids live: `localStorage` in both browsers, the OS
 * secure store on a phone. One key, so the surfaces can never disagree. */
export const APP_POPUP_DISMISSED_KEY = 'duncit_app_popup_dismissed';

/** Ids kept, oldest dropped first. Bounded because the list is only ever
 * consulted for popups the server still considers live — older ids cost
 * storage and answer nothing. */
export const APP_POPUP_DISMISSED_MAX = 50;

/** The aspect a card assumes before the picture has decoded (4:5 portrait —
 * what campaign art overwhelmingly is), so the overlay never opens at one size
 * and then jumps to another. */
export const APP_POPUP_DEFAULT_ASPECT = 0.8;

/** The card never grows past this, however wide the screen is — a marketing
 * image stretched across a desktop browser stops reading as a phone popup. */
export const APP_POPUP_MAX_WIDTH = 420;

/** How much of the viewport's height the image may take. The rest is the CTA
 * and the breathing room around the card. */
export const APP_POPUP_HEIGHT_FRACTION = 0.62;

/** Clear space each side of the card on a narrow screen, so the backdrop is
 * always visible to tap. */
export const APP_POPUP_VIEWPORT_GUTTER = 24;

/**
 * The key/value store a surface hands in — `localStorage` on the web,
 * `expo-secure-store` on a phone. Described structurally rather than imported
 * so this package keeps depending on nothing at all, which is what lets the
 * native app compile it from source.
 */
export interface AppPopupStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): unknown;
}

/** A width/height pair — an image's intrinsic size, a viewport, or a box. */
export interface AppPopupSize {
  width: number;
  height: number;
}

/**
 * The stored ids, tolerating anything that is not the list we wrote. A corrupt
 * or hand-edited value means "nothing dismissed" — showing a popup once more is
 * always better than throwing on app open.
 */
export function parseDismissedPopupIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

/**
 * `ids` plus `id`, newest last and capped. An id already present is left where
 * it is, so closing the same popup twice never evicts a different campaign.
 */
export function withDismissedPopupId(ids: string[], id: string): string[] {
  if (!id || ids.includes(id)) return ids;
  return [...ids, id].slice(-APP_POPUP_DISMISSED_MAX);
}

/** Whether this popup has already been closed on this device. */
export function isPopupDismissed(ids: string[], id: string | null | undefined): boolean {
  if (!id) return false;
  return ids.includes(id);
}

/**
 * The ids closed on this device. Storage can be unavailable — private
 * browsing, a locked keystore, a web build with cookies blocked — and that
 * costs the popup showing once more, never an error on app open.
 */
export async function readDismissedPopupIds(storage: AppPopupStorage): Promise<string[]> {
  try {
    return parseDismissedPopupIds(await storage.getItem(APP_POPUP_DISMISSED_KEY));
  } catch {
    return [];
  }
}

/** Record that this popup was closed, and answer with the new list. */
export async function rememberDismissedPopup(
  storage: AppPopupStorage,
  id: string
): Promise<string[]> {
  const next = withDismissedPopupId(await readDismissedPopupIds(storage), id);
  try {
    await storage.setItem(APP_POPUP_DISMISSED_KEY, JSON.stringify(next));
  } catch {
    // Nothing to do: the server dismissal is still on its way, and the worst
    // case is this device offering the popup one more time.
  }
  return next;
}

/** The aspect to draw at — the picture's own once it has decoded, the portrait
 * default until then. */
export function appPopupAspect(natural: AppPopupSize | null | undefined): number {
  if (!natural || natural.width <= 0 || natural.height <= 0) return APP_POPUP_DEFAULT_ASPECT;
  return natural.width / natural.height;
}

/** How large the image is allowed to be on a screen of this size. */
export function appPopupLimits(viewport: AppPopupSize): AppPopupSize {
  return {
    width: Math.min(APP_POPUP_MAX_WIDTH, viewport.width - APP_POPUP_VIEWPORT_GUTTER * 2),
    height: viewport.height * APP_POPUP_HEIGHT_FRACTION,
  };
}

/**
 * The largest box with the picture's own aspect that still fits `limits`.
 *
 * Sizing from the art rather than from the screen is the whole point: the box
 * touches one limit exactly and stays inside the other, so there is no dead
 * space beside the image and nothing is cropped away.
 */
export function appPopupImageSize(
  natural: AppPopupSize | null | undefined,
  limits: AppPopupSize
): AppPopupSize {
  const aspect = appPopupAspect(natural);
  const width = Math.min(Math.max(1, limits.width), Math.max(1, limits.height) * aspect);
  return { width: Math.round(width), height: Math.round(width / aspect) };
}

/** What a client reports about itself when it asks for a popup — the server's
 * `AppPopupClientPlatform` enum, as plain literals so this package still
 * imports nothing. */
export type AppPopupClientPlatform = 'IOS' | 'ANDROID' | 'WEB';

/**
 * Which app build a BROWSER stands in for.
 *
 * mWeb and the native web build are both the app in a browser, so a phone
 * reports its real OS and a campaign aimed at Android reaches Android users on
 * every surface (rule 27). A desktop browser is neither store build, so it only
 * ever gets the popups aimed at everyone.
 */
export function detectClientPlatform(userAgent: string): AppPopupClientPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'IOS';
  if (/Android/i.test(userAgent)) return 'ANDROID';
  return 'WEB';
}
