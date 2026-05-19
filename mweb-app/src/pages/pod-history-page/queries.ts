import { gql } from '@apollo/client';

export const MY_POD_MEMBERSHIPS = gql`
  query MyPodMembershipsForHistory {
    myPodMemberships {
      id
      status
      joined_at
      backed_out_at
      refund_status
      referral_token
      source
      pod {
        id
        pod_id
        pod_title
        pod_date_time
        pod_amount
        pod_type
        pod_images_and_videos {
          url
          type
        }
      }
    }
  }
`;

export interface PodHistoryItem {
  id: string;
  status: 'JOINED' | 'BACKED_OUT';
  joined_at: string;
  backed_out_at?: string | null;
  refund_status: 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';
  referral_token?: string | null;
  source: string;
  pod?: {
    id: string;
    pod_id: string;
    pod_title: string;
    pod_date_time: string;
    pod_amount: number;
    pod_type: string;
    pod_images_and_videos: Array<{ url: string; type: string }>;
  } | null;
}