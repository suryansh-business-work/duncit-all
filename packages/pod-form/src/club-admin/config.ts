import { makeNativeParityPodConfig } from '../configs';

/** Native-parity pod form for Club Admins: venue slots, place charges, reel and
 * an optional assign-host picker (the server injects the admin when empty). */
export const CLUB_ADMIN_POD_CONFIG = makeNativeParityPodConfig({ showProducts: true });

/** Partner clubs (`myAdminClubs`, the host's club lookups) expose their linked
 * venue ids directly on `meetup_venues_id`. */
export const getClubVenueIds = (club: any): string[] => club?.meetup_venues_id ?? [];
