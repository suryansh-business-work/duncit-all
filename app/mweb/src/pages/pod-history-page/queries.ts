import { gql } from '@apollo/client';

export const MY_POD_MEMBERSHIPS = gql`
  query MyPodMembershipsForHistory {
    myPodMemberships {
      id
      status
      joined_at
      backed_out_at
      payment_id
      refund_status
      refund_payment_id
      referral_token
      source
      pod {
        id
        pod_id
        club_slug
        pod_title
        pod_date_time
        pod_end_date_time
        pod_amount
        pod_type
        no_of_spots
        pod_images_and_videos {
          url
          type
        }
        club {
          id
          category_id
          super_category_id
        }
      }
    }
  }
`;

/** Super + Category tree for the Pod History filter (For You / For Your Pet → Sports …). */
export const POD_HISTORY_CATEGORIES = gql`
  query PodHistoryCategories {
    categories {
      id
      name
      level
      parent_id
    }
  }
`;

export const BACKOUT_POD_HISTORY = gql`
  mutation BackoutPodFromHistory($pod_doc_id: ID!) {
    backoutPod(pod_doc_id: $pod_doc_id) {
      id
      status
      backed_out_at
      refund_status
      refund_payment_id
      referral_token
    }
  }
`;

export const POD_HISTORY_INVOICE_PDF = gql`
  query PodHistoryInvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`;

export const POD_HISTORY_TICKET_FOR_POD = gql`
  query PodHistoryTicketForPod($podId: ID!) {
    myEventTicketForPod(pod_doc_id: $podId) {
      id
      ticket_code
    }
  }
`;

export const POD_HISTORY_TICKET_PDF = gql`
  query PodHistoryTicketPdf($id: ID!) {
    eventTicketPdfBase64(ticket_doc_id: $id)
  }
`;

export interface PodHistoryItem {
  id: string;
  pod_id?: string | null;
  status: 'JOINED' | 'BACKED_OUT';
  joined_at: string;
  backed_out_at?: string | null;
  payment_id?: string | null;
  refund_status: 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';
  refund_payment_id?: string | null;
  referral_token?: string | null;
  source: string;
  pod?: {
    id: string;
    pod_id: string;
    club_slug?: string | null;
    pod_title: string;
    pod_date_time: string;
    pod_end_date_time?: string | null;
    pod_amount: number;
    pod_type: string;
    no_of_spots?: number | null;
    pod_images_and_videos: Array<{ url: string; type: string }>;
    club?: { id: string; category_id?: string | null; super_category_id?: string | null } | null;
  } | null;
}

export type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

export interface PodHistoryCategory {
  id: string;
  name: string;
  level: CategoryLevel;
  parent_id?: string | null;
}