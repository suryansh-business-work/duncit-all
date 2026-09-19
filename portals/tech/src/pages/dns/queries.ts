import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  DnsZone,
  MutationAddDnsRecordArgs,
  MutationDeleteDnsRecordArgs,
  MutationUpdateDnsRecordArgs,
} from '@duncit/gql-types';

/** The zone and the rules its editor follows — GoDaddy's TTL bounds and the types this console writes. */
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

/** The full host a record answers for: `@` is the domain itself. */
export const recordHost = (name: string, domain: string): string => (name === '@' ? domain : `${name}.${domain}`);
