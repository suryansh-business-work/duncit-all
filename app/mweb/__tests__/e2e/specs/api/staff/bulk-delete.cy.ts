/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { ACCESS_DENIED, revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, NO_ID, type StaffCall } from '../../../support/api-staff';

/**
 * Staff › Bulk delete — StartBulkDelete honours each table's own role list
 * (platform/backgroundJob/bulkDelete.targets.ts), checked before the scope is
 * read or a job is created (backgroundJob.service.ts startBulkDelete). Every
 * request ticks one id no row has, so even a table the caller owns can only
 * answer "nothing to delete". Scenario map: Staff › Bulk delete "Bulk delete
 * honours each table's own role list".
 */

const ROLES: readonly E2eStaffRole[] = ['CRM_MANAGER', 'ADS_MANAGER', 'LEGAL_MANAGER'];

const bulkDelete = (table: string): StaffCall =>
  call(
    'startBulkDelete',
    `mutation E2eStartBulkDelete($table: String!, $id: String!) {
      startBulkDelete(input: { table: $table, mode: SELECTED, variables: "{}", ids: [$id] }) { __typename }
    }`,
    { table, id: NO_ID },
  );

const badInput = (message: string) => ({ code: 'BAD_USER_INPUT', message });

describe('API · Bulk delete by table role', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('BD-01 CRM_MANAGER is refused bulk deletes on the Legal contracts and Finance expenses tables', () => {
    asRole('CRM_MANAGER', (token) => {
      expectCallsRefused(token, [bulkDelete('contractsTable'), bulkDelete('expensesTable')], ACCESS_DENIED);
    });
  });

  it('BD-02 ADS_MANAGER is refused bulk deletes on the ad review tables, which belong to Marketing', () => {
    asRole('ADS_MANAGER', (token) => {
      expectCallsRefused(token, [bulkDelete('adRequestsTable'), bulkDelete('liveAdsTable')], ACCESS_DENIED);
    });
  });

  it('BD-03 LEGAL_MANAGER is refused CRM leads but passes on its own contracts table, where no row matches', () => {
    asRole('LEGAL_MANAGER', (token) => {
      expectCallsRefused(token, [bulkDelete('venueLeadsTable')], ACCESS_DENIED);
      expectCallsRefused(
        token,
        [bulkDelete('contractsTable')],
        badInput('No rows match — there is nothing to delete.'),
      );
    });
  });

  it('BD-04 a table that offers no bulk delete is refused for anyone', () => {
    asRole('LEGAL_MANAGER', (token) => {
      expectCallsRefused(token, [bulkDelete('usersTable')], badInput('This table does not support bulk delete.'));
    });
  });
});
