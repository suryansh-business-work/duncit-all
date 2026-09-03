import type { Translate } from '@/i18n/fallback';
import type { StudioMode } from '@/utils/studio-mode';
import type { ProfileTile } from './profileSections';

/**
 * The venue partner's calendar and settings rows, appended after Venue
 * Earnings while the sidebar is in Venue mode. Built here with the caller's
 * translator rather than in `profileSections` so their labels are real copy
 * from the bundle (rule 38); the routes are mWeb's exact paths (rule 27).
 */
export function buildVenueMenuItems(mode: StudioMode, t: Translate): ProfileTile[] {
  if (mode !== 'VENUE') return [];
  return [
    {
      key: 'venue-availability',
      label: t('mweb.venueMenu.availability'),
      caption: '',
      icon: 'event-repeat',
      route: 'VenueAvailability',
    },
    {
      key: 'venue-settings',
      label: t('mweb.venueMenu.settings'),
      caption: '',
      icon: 'settings',
      route: 'VenueSettings',
    },
  ];
}
