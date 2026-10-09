import { partnerPortalUrl } from '@duncit/onboarding';

/**
 * Opens a Partner console page — for an option this app has no page for (a
 * brand's catalogue, its integrations and returns) and for the venue
 * registration wizard behind "Add a venue" / "Edit".
 */
export function openPartnerPortal(path: string): void {
  globalThis.location.assign(partnerPortalUrl(path));
}
