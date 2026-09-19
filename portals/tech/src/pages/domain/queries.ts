import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  DnsDomainInfo,
  DnsSyncResult,
  DnsZone,
  MutationAddDnsRecordArgs,
  MutationDeleteDnsRecordArgs,
  MutationSyncStagingDnsArgs,
  MutationUpdateDnsRecordArgs,
} from '@duncit/gql-types';

/**
 * The zone, the rules its editor follows — GoDaddy's TTL bounds and the types
 * this console writes — and the two views derived from the same records: the
 * per-type counts and the staging comparison. All of it arrives in one call,
 * because the server computes both from the records it already fetched.
 */
export const DNS_ZONE: TypedDocumentNode<{ dnsZone: DnsZone }> = gql`
  query DnsZone {
    dnsZone {
      configured
      domain
      writable_types
      min_ttl
      max_ttl
      records {
        id
        type
        name
        data
        ttl
        priority
        editable
        scope
      }
      by_type {
        type
        total
        production
        staging
      }
      staging {
        production_count
        staging_count
        matched
        missing_staging
        missing_production
        differs
        in_sync
        paired_types
        pairs {
          id
          type
          name
          host
          staging_name
          staging_host
          production_values
          staging_values
          ttl
          state
          fixable
        }
      }
    }
  }
`;

/** The domain at the registrar. Its own query: a second GoDaddy call the records table must not wait on. */
export const DNS_DOMAIN_INFO: TypedDocumentNode<{ dnsDomainInfo: DnsDomainInfo }> = gql`
  query DnsDomainInfo {
    dnsDomainInfo {
      configured
      domain
      domain_id
      status
      expires_at
      created_at
      days_to_expiry
      renew_auto
      renew_deadline
      renewable
      locked
      privacy
      transfer_protected
      expiration_protected
      hold_registrar
      name_servers
      contacts {
        role
        name
        organization
        email
        phone
      }
    }
  }
`;

export const ADD_DNS_RECORD: TypedDocumentNode<{ addDnsRecord: boolean }, MutationAddDnsRecordArgs> = gql`
  mutation AddDnsRecord($input: DnsRecordInput!) {
    addDnsRecord(input: $input)
  }
`;

export const UPDATE_DNS_RECORD: TypedDocumentNode<{ updateDnsRecord: boolean }, MutationUpdateDnsRecordArgs> = gql`
  mutation UpdateDnsRecord($ref: DnsRecordRef!, $input: DnsRecordInput!) {
    updateDnsRecord(ref: $ref, input: $input)
  }
`;

export const DELETE_DNS_RECORD: TypedDocumentNode<{ deleteDnsRecord: boolean }, MutationDeleteDnsRecordArgs> = gql`
  mutation DeleteDnsRecord($ref: DnsRecordRef!) {
    deleteDnsRecord(ref: $ref)
  }
`;

export const SYNC_STAGING_DNS: TypedDocumentNode<{ syncStagingDns: DnsSyncResult }, MutationSyncStagingDnsArgs> = gql`
  mutation SyncStagingDns($ids: [String!]!) {
    syncStagingDns(ids: $ids) {
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

/** The full host a record answers for: `@` is the domain itself. */
export const recordHost = (name: string, domain: string): string => (name === '@' ? domain : `${name}.${domain}`);
