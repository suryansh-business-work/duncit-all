import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  CloudflareMigration,
  DnsSyncResult,
  MutationCopyDnsToCloudflareArgs,
  MutationDeleteCloudflareDnsRecordArgs,
  MutationSetDomainNameServersArgs,
} from '@duncit/gql-types';

/**
 * Both zones side by side and where the domain points today, in one call: the
 * DNS tab and the Nameservers tab read the same answer, so switching tabs
 * never re-reads two providers.
 */
export const CLOUDFLARE_MIGRATION: TypedDocumentNode<{ cloudflareMigration: CloudflareMigration }> = gql`
  query CloudflareMigration {
    cloudflareMigration {
      godaddy_configured
      cloudflare_configured
      connected
      domain
      cloudflare_domain
      zone {
        id
        status
        paused
        name_servers
        activated_on
      }
      rows {
        id
        type
        name
        host
        priority
        godaddy_value
        cloudflare_value
        proxied
        state
        copyable
      }
      matched
      godaddy_only
      cloudflare_only
      current_name_servers
      godaddy_name_servers
      live_provider
      ready_to_switch
    }
  }
`;

export const CREATE_CLOUDFLARE_ZONE: TypedDocumentNode<{ createCloudflareZone: boolean }> = gql`
  mutation CreateCloudflareZone {
    createCloudflareZone
  }
`;

export const COPY_DNS_TO_CLOUDFLARE: TypedDocumentNode<
  { copyDnsToCloudflare: DnsSyncResult },
  MutationCopyDnsToCloudflareArgs
> = gql`
  mutation CopyDnsToCloudflare($ids: [String!]!) {
    copyDnsToCloudflare(ids: $ids) {
      synced
      failed
      outcomes {
        id
        host
        ok
        message
      }
    }
  }
`;

export const DELETE_CLOUDFLARE_DNS_RECORD: TypedDocumentNode<
  { deleteCloudflareDnsRecord: boolean },
  MutationDeleteCloudflareDnsRecordArgs
> = gql`
  mutation DeleteCloudflareDnsRecord($id: String!) {
    deleteCloudflareDnsRecord(id: $id)
  }
`;

export const CHECK_CLOUDFLARE_ACTIVATION: TypedDocumentNode<{ checkCloudflareActivation: boolean }> = gql`
  mutation CheckCloudflareActivation {
    checkCloudflareActivation
  }
`;

export const SET_DOMAIN_NAME_SERVERS: TypedDocumentNode<
  { setDomainNameServers: boolean },
  MutationSetDomainNameServersArgs
> = gql`
  mutation SetDomainNameServers($target: NameServerTarget!, $name_servers: [String!]) {
    setDomainNameServers(target: $target, name_servers: $name_servers)
  }
`;
