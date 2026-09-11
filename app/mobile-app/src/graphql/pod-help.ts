import { gql } from '@/generated/graphql';

/** Ask a pod's club admins for help, over email and WhatsApp — as its host or
 * as the venue it runs at. Twin of mWeb's RequestPodClubAdminHelp (rule 27). */
export const RequestPodClubAdminHelpDocument = gql(`
  mutation MobileRequestPodClubAdminHelp($pod_doc_id: ID!, $side: PodHelpSide!) {
    requestPodClubAdminHelp(pod_doc_id: $pod_doc_id, side: $side) {
      status
      notified
    }
  }
`);
