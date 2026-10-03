import { gql, type TypedDocumentNode } from '@apollo/client';
import type { QuerySslLiveCheckArgs, SslLiveCheck, SslOverview } from '@duncit/gql-types';

/** Every certificate certbot holds on the VPS, read from the host's /etc/letsencrypt. */
export const SSL_CERTIFICATES: TypedDocumentNode<{ sslCertificates: SslOverview }> = gql`
  query SslCertificates {
    sslCertificates {
      available
      error
      checked_at
      certificates {
        name
        common_name
        domains
        coverage
        key_type
        issuer
        serial_number
        fingerprint_sha256
        valid_from
        valid_to
        days_remaining
        renewal_due_at
        authenticator
        installer
        production_ca
      }
    }
  }
`;

/** What each host on one certificate serves right now — dialled only when its details open. */
export const SSL_LIVE_CHECK: TypedDocumentNode<{ sslLiveCheck: SslLiveCheck[] }, QuerySslLiveCheckArgs> = gql`
  query SslLiveCheck($name: String!) {
    sslLiveCheck(name: $name) {
      domain
      checked
      reachable
      trusted
      serving_this
      valid_to
      error
    }
  }
`;
