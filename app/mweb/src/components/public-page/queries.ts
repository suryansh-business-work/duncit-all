import { gql } from '@apollo/client';

/**
 * The live pods with a reel at one venue, or by one host — the Reels row on
 * the public venue and host pages. Public: it answers signed out. Only what a
 * reel tile draws and the pod link it opens.
 */
export const PUBLIC_POD_REELS = gql`
  query PublicPodReels($venueId: ID, $hostUserId: ID) {
    pods(filter: { venue_id: $venueId, host_user_id: $hostUserId, has_reel: true, is_active: true }) {
      id
      pod_id
      pod_title
      club_slug
      reel_url
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

export interface PublicReelPod {
  id: string;
  pod_id: string;
  pod_title: string;
  club_slug: string;
  reel_url: string | null;
  pod_images_and_videos: Array<{ url: string; type: string | null }>;
}
