import type { AppPopupClientPlatform } from './queries';

/**
 * Which app build this browser stands in for.
 *
 * mWeb IS the app in a browser, so a phone reports its real OS and a campaign
 * targeted at Android reaches Android users on both surfaces (rule 27). A
 * desktop browser is neither store build, so it only ever gets the popups
 * aimed at everyone.
 */
export function detectClientPlatform(userAgent: string): AppPopupClientPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'IOS';
  if (/Android/i.test(userAgent)) return 'ANDROID';
  return 'WEB';
}
