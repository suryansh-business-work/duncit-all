import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  PortalSecurityAccessEntry,
  PortalSecurityConsentRecord,
  PortalSecurityExceptionSummary,
  PortalSecurityLog,
  PortalSecurityLogDetail,
  QueryPortalSecurityLogArgs,
  QueryPortalSecurityLogsTableArgs,
} from '@duncit/gql-types';

/**
 * One row of the log table: a masked address and a coarse place, never the full
 * address or a position. Those are read one record at a time, and reading them
 * is recorded on the server.
 */
export type LogRow = Pick<
  PortalSecurityLog,
  | 'id'
  | 'created_at'
  | 'user_name'
  | 'user_email'
  | 'roles'
  | 'portal_key'
  | 'result'
  | 'method'
  | 'is_employee'
  | 'employee_title'
  | 'ip_masked'
  | 'ip_city'
  | 'ip_region'
  | 'ip_country'
  | 'has_location'
  | 'browser'
  | 'os'
>;

/** What the time log under "When" needs of the person's other verifications. */
export type RelatedLog = Pick<PortalSecurityLog, 'id' | 'created_at' | 'portal_key' | 'result' | 'method'>;

/** One verification in full. */
export type LogDetail = Pick<
  PortalSecurityLogDetail,
  | 'id'
  | 'created_at'
  | 'signed_in_at'
  | 'user_name'
  | 'user_email'
  | 'roles'
  | 'portal_key'
  | 'result'
  | 'method'
  | 'is_employee'
  | 'employee_title'
  | 'employee_department'
  | 'employment_type'
  | 'current_is_employee'
  | 'current_employee_title'
  | 'ip'
  | 'ip_city'
  | 'ip_region'
  | 'ip_country'
  | 'has_location'
  | 'latitude'
  | 'longitude'
  | 'accuracy_m'
  | 'location_error'
  | 'browser'
  | 'os'
  | 'device_type'
  | 'user_agent'
  | 'duid'
  | 'timezone'
  | 'language'
  | 'platform'
  | 'policy_version'
  | 'notice_version'
> & {
  consent: PortalSecurityConsentRecord;
  exception?: Pick<
    PortalSecurityExceptionSummary,
    'status' | 'reason' | 'decided_by_name' | 'decided_at' | 'decision_note'
  > | null;
  related: RelatedLog[];
  access_history: PortalSecurityAccessEntry[];
};

export const PORTAL_SECURITY_LOGS_TABLE: TypedDocumentNode<
  { portalSecurityLogsTable: { rows: LogRow[]; total: number } },
  QueryPortalSecurityLogsTableArgs
> = gql`
  query PortalSecurityLogsTable($query: TableQueryInput) {
    portalSecurityLogsTable(query: $query) {
      rows {
        id
        created_at
        user_name
        user_email
        roles
        portal_key
        result
        method
        is_employee
        employee_title
        ip_masked
        ip_city
        ip_region
        ip_country
        has_location
        browser
        os
      }
      total
    }
  }
`;

/**
 * One verification with its address and position. The server writes an access
 * entry BEFORE it answers, so this is only ever asked for when a row is opened,
 * and never from the cache (see the drawer).
 */
export const PORTAL_SECURITY_LOG: TypedDocumentNode<
  { portalSecurityLog: LogDetail },
  QueryPortalSecurityLogArgs
> = gql`
  query PortalSecurityLog($id: ID!) {
    portalSecurityLog(id: $id) {
      id
      created_at
      signed_in_at
      user_name
      user_email
      roles
      portal_key
      result
      method
      is_employee
      employee_title
      employee_department
      employment_type
      current_is_employee
      current_employee_title
      ip
      ip_city
      ip_region
      ip_country
      has_location
      latitude
      longitude
      accuracy_m
      location_error
      browser
      os
      device_type
      user_agent
      duid
      timezone
      language
      platform
      policy_version
      notice_version
      consent {
        authorized_person
        credentials_not_shared
        policies_acknowledged
        location_consent
      }
      exception {
        status
        reason
        decided_by_name
        decided_at
        decision_note
      }
      related {
        id
        created_at
        portal_key
        result
        method
      }
      access_history {
        id
        actor_name
        action
        created_at
      }
    }
  }
`;
