/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused } from '../../../support/api-staff';

/**
 * Staff › Delete-all — emptying the email log is SUPER_ADMIN alone
 * (content/emailLog/emailLog.resolver.ts DELETE_ALL_ROLES, the first statement
 * of deleteAllEmailLogs), although COMMUNICATIONS_MANAGER may delete single
 * email logs (ADMIN_ROLES). An unscoped telemetry delete takes TELEMETRY_WRITE
 * before DELETE_ALL_ROLES (platform/telemetry/telemetry.resolver.ts), so these
 * roles are refused it at the first gate. TECH_MANAGER cannot be granted to a
 * run account, so its half of the row is not automated. Scenario map: Staff ›
 * Delete-all "Delete-all on logs is SUPER_ADMIN only".
 */

const ROLES: readonly E2eStaffRole[] = ['COMMUNICATIONS_MANAGER', 'LOGS_MANAGER'];

const DELETE_ALL = [
  call('deleteAllEmailLogs', `mutation E2eDeleteAllEmailLogs { deleteAllEmailLogs }`),
  call('deleteTelemetryRecords', `mutation E2eDeleteAllTelemetry { deleteTelemetryRecords(target: LOGS, scope: {}) }`),
];

describe('API · Emptying a log is for a super admin', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('DA-01 COMMUNICATIONS_MANAGER, who deletes single email logs, is refused emptying the email and telemetry logs', () => {
    asRole('COMMUNICATIONS_MANAGER', (token) => expectCallsRefused(token, DELETE_ALL));
  });

  it('DA-02 LOGS_MANAGER, who reads every log, is refused emptying them', () => {
    asRole('LOGS_MANAGER', (token) => expectCallsRefused(token, DELETE_ALL));
  });
});
