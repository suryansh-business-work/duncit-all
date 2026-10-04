import { gql, type TypedDocumentNode } from '@apollo/client';
import type { PortMapOverview } from '@duncit/gql-types';

/** Every domain → port route nginx serves, read live from the host's sites-available. */
export const PORT_MAPPINGS: TypedDocumentNode<{ portMappings: PortMapOverview }> = gql`
  query PortMappings {
    portMappings {
      available
      error
      checked_at
      sites {
        name
        enabled
        domain_count
      }
      routes {
        site
        enabled
        domain
        location
        target
        host
        port
        tls
      }
    }
  }
`;
