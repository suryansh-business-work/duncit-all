import { gql } from '@apollo/client';

/** The saved lists, so a send made to one is named in its detail — as it is in
 * the Communications console, which reads them with its send setup. */
export const LOGS_WA_AUDIENCE_LISTS = gql`
  query LogsWaAudienceLists {
    audienceLists {
      id
      name
      member_count
    }
  }
`;
