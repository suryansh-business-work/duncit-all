import gql from 'graphql-tag';

export const podHelpTypeDefs = gql`
  "Which side of a pod is asking its club admin for help."
  enum PodHelpSide {
    HOST
    VENUE
  }

  """
  What happened to a help request. SENT means every admin of the pod's club was
  messaged; ALREADY_REQUESTED means this side already asked about this pod today;
  NO_CLUB_ADMIN means the pod's club has nobody to ask.
  """
  enum PodHelpStatus {
    SENT
    ALREADY_REQUESTED
    NO_CLUB_ADMIN
  }

  type PodHelpRequestResult {
    status: PodHelpStatus!
    "How many club admins were messaged."
    notified: Int!
  }

  extend type Mutation {
    """
    Ask the pod's club admins for help, over email and WhatsApp. The caller must
    be the pod's host (side HOST) or the owner of the venue it runs at (side VENUE).
    """
    requestPodClubAdminHelp(pod_doc_id: ID!, side: PodHelpSide!): PodHelpRequestResult!
  }
`;
