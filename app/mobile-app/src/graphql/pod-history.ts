import { gql } from '@/generated/graphql';

/**
 * The signed-in user's pod memberships — RN port of mWeb's MY_POD_MEMBERSHIPS.
 * Backs both the Pod History list and the membership details screen.
 */
export const MyPodMembershipsDocument = gql(`
  query MobileMyPodMemberships {
    myPodMemberships {
      id
      pod_id
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
`);

/** Super + Category tree for the Pod History filter (For You / For Your Pet → Sports …). */
export const PodHistoryCategoriesDocument = gql(`
  query MobilePodHistoryCategories {
    categories {
      id
      name
      level
      parent_id
    }
  }
`);

/** Back out of a joined pod — mWeb's BACKOUT_POD_HISTORY. */
export const BackoutPodDocument = gql(`
  mutation MobileBackoutPod($pod_doc_id: ID!) {
    backoutPod(pod_doc_id: $pod_doc_id) {
      id
      status
      backed_out_at
      refund_status
      refund_payment_id
      referral_token
    }
  }
`);

/** Base64 PDF invoice for a payment — mWeb's POD_HISTORY_INVOICE_PDF. */
export const PodInvoicePdfDocument = gql(`
  query MobilePodInvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`);

/** The current user's event ticket for a pod (id + code for download). */
export const MyEventTicketForPodDocument = gql(`
  query MobileMyEventTicketForPod($podId: ID!) {
    myEventTicketForPod(pod_doc_id: $podId) {
      id
      ticket_code
    }
  }
`);

/** Base64 PDF for an event ticket. */
export const EventTicketPdfDocument = gql(`
  query MobileEventTicketPdf($id: ID!) {
    eventTicketPdfBase64(ticket_doc_id: $id)
  }
`);
