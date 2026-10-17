export const APP_SHELL_MAX_WIDTH = 1023;

/** The id of the app shell's page region — the skip link's target. */
export const MAIN_CONTENT_ID = 'main-content';

/** Space a scrolling page keeps under its content: the bottom bar plus a gap
 * so the last row does not sit flush on it (BottomNav measures both). */
const BOTTOM_NAV_CONTENT_OFFSET = 'var(--duncit-bottom-nav-content-offset, 148px)';
/** The bottom bar's own height. */
const BOTTOM_NAV_HEIGHT = 'var(--duncit-bottom-nav-height, 64px)';

/** A chat room is a full-height page whose composer belongs right on top of
 * the bottom bar, not a scrolling page that needs the breathing gap. */
export const isFullHeightRoute = (pathname: string) => /^\/chats\/.+/.test(pathname);

/** What the page region reserves for the bottom bar on this route. */
export function bottomNavReserve(showBottomNav: boolean, pathname: string): string {
  if (!showBottomNav) return '0px';
  return isFullHeightRoute(pathname) ? BOTTOM_NAV_HEIGHT : BOTTOM_NAV_CONTENT_OFFSET;
}
