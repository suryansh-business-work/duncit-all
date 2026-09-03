import type { Translate } from '@/i18n/fallback';
import type { StudioMode } from '@/utils/studio-mode';
import type { ProfileTile } from './profileSections';

/**
 * The Club Admin's dashboard and monitoring rows, appended after Club Studio
 * while the sidebar is in Club Admin mode — the twin of `venueMenuItems`.
 * Built with the caller's translator so the labels are real copy from the
 * bundle (rule 38); the routes are mWeb's exact paths (rule 27).
 */
export function buildClubMenuItems(mode: StudioMode, t: Translate): ProfileTile[] {
  if (mode !== 'CLUB') return [];
  return [
    {
      key: 'club-dashboard',
      label: t('mweb.clubMenu.dashboard'),
      caption: '',
      icon: 'insights',
      route: 'ClubAdminDashboard',
    },
    {
      key: 'club-monitoring',
      label: t('mweb.clubMenu.monitoring'),
      caption: '',
      icon: 'security',
      route: 'ClubPodMonitoring',
    },
  ];
}
