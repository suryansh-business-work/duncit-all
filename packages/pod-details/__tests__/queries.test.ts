import { describe, expect, it } from 'vitest';
import { argumentsAt, fieldsAt, operationOf, variablesOf } from './gql-contract';
import {
  POD_ATTENDEES_ADMIN,
  POD_AUDIT_TRAIL,
  POD_CLUB_DETAIL,
  POD_DETAIL,
  POD_HOST_PROFILE,
  POD_PAYMENTS_TABLE,
} from '../src/queries';

describe('POD_DETAIL', () => {
  it('opens cancelled pods too (include_deleted) and reads the timeline fields', () => {
    expect(operationOf(POD_DETAIL)).toEqual({ name: 'AdminPodDetail', type: 'query' });
    expect(argumentsAt(POD_DETAIL, 'pod')).toMatchObject({
      pod_doc_id: '$id',
      include_deleted: 'true',
    });
    expect(fieldsAt(POD_DETAIL, 'pod')).toEqual(
      expect.arrayContaining([
        'created_at',
        'completed_at',
        'is_deleted',
        'deleted_at',
        'venue_approval_status',
        'pod_hosts_id',
        'host_names',
      ]),
    );
  });
});

describe('POD_ATTENDEES_ADMIN', () => {
  it('selects the strike-through fields — status and the replacement link', () => {
    expect(variablesOf(POD_ATTENDEES_ADMIN)).toEqual({ id: 'ID!' });
    expect(fieldsAt(POD_ATTENDEES_ADMIN, 'adminPodAttendees')).toEqual(
      expect.arrayContaining([
        'member_id',
        'user_id',
        'full_name',
        'email',
        'phone',
        'is_host',
        'status',
        'backout_no',
        'replaced_by_user_id',
        'replaced_by_name',
      ]),
    );
  });
});

describe('POD_AUDIT_TRAIL', () => {
  it('reads the activity entries the timeline renders', () => {
    expect(fieldsAt(POD_AUDIT_TRAIL, 'podAuditLogs')).toEqual(
      expect.arrayContaining(['action', 'source', 'actor_name', 'note', 'created_at']),
    );
  });
});

describe('POD_CLUB_DETAIL / POD_HOST_PROFILE', () => {
  it('reads club admins and the host profile contacts', () => {
    // e6a3ebe67: the pod page names the club admins AND how to reach them.
    expect(fieldsAt(POD_CLUB_DETAIL, 'club', 'club_admins')).toEqual([
      'id',
      'name',
      'avatar_url',
      'email',
      'phone',
      'whatsapp',
    ]);
    expect(fieldsAt(POD_HOST_PROFILE, 'hostByUser')).toEqual(
      expect.arrayContaining(['host_no', 'full_name', 'email', 'phone', 'status']),
    );
  });
});

describe('POD_PAYMENTS_TABLE', () => {
  it('is the shared table engine page over paymentsTable', () => {
    expect(operationOf(POD_PAYMENTS_TABLE)).toEqual({
      name: 'AdminPodPaymentsTable',
      type: 'query',
    });
    expect(variablesOf(POD_PAYMENTS_TABLE)).toEqual({ query: 'TableQueryInput' });
    expect(fieldsAt(POD_PAYMENTS_TABLE, 'paymentsTable')).toEqual(
      expect.arrayContaining(['rows', 'total', 'page', 'page_size']),
    );
    expect(fieldsAt(POD_PAYMENTS_TABLE, 'paymentsTable', 'rows')).toEqual(
      expect.arrayContaining(['payment_id', 'user_name', 'user_email', 'total', 'status', 'paid_at']),
    );
  });
});
