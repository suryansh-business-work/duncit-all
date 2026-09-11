/**
 * Pins a page's bottom action bar (cart checkout, product detail) just above
 * the floating bottom nav — and above the app-install banner when it shows.
 * Both publish their heights as CSS variables; with neither on screen the bar
 * clears the safe-area inset instead.
 */
export const STICKY_BAR_SX = {
  position: 'sticky',
  bottom:
    'calc(8px + var(--duncit-bottom-nav-overlay-offset, env(safe-area-inset-bottom, 0px)) + var(--duncit-app-banner-offset, 0px))',
  zIndex: 5,
} as const;
