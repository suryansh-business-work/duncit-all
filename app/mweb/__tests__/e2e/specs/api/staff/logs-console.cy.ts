/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, CALLS, expectCallsRefused, expectTableRead, NO_ID } from '../../../support/api-staff';

/**
 * Logs console — LOGS_MANAGER reads the log pages it borrows from the other
 * consoles (middleware/rbac.ts LOGS_READER, added to READ gates only) and acts
 * on none of them: refunds and retries stay Finance's (payment.resolver.ts
 * ADMIN_RW), deletes stay with the owning console (telemetry TELEMETRY_WRITE,
 * emailLog ADMIN_ROLES). Scenario map: Staff › Logs console "LOGS_MANAGER reads
 * borrowed logs but cannot refund, retry or delete".
 */

const ROLES: readonly E2eStaffRole[] = ['LOGS_MANAGER'];

const BORROWED_READS = [
  CALLS.paymentsTable,
  CALLS.userRefundsTable,
  call('telemetryLogsTable', `query E2eTelemetryLogs { telemetryLogsTable(query: { page_size: 1 }) { total } }`),
  call('emailLogsTable', `query E2eEmailLogs { emailLogsTable(query: { page_size: 1 }) { total } }`),
];

const LOG_DELETES = [
  call(
    'deleteTelemetryRecords',
    `mutation E2eDeleteTelemetry($id: ID!) { deleteTelemetryRecords(target: LOGS, scope: { ids: [$id] }) }`,
    { id: NO_ID },
  ),
  call('deleteBugs', `mutation E2eDeleteBugs($id: ID!) { deleteBugs(ids: [$id]) }`, { id: NO_ID }),
  call('deleteEmailLogs', `mutation E2eDeleteEmailLogs($id: ID!) { deleteEmailLogs(ids: [$id]) }`, { id: NO_ID }),
];

describe('API · The Logs seat reads every log and acts on none', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('LC-01 LOGS_MANAGER reads payments, refunds, telemetry and email logs', () => {
    asRole('LOGS_MANAGER', (token) => {
      BORROWED_READS.forEach((read) => expectTableRead(token, read));
    });
  });

  it('LC-02 LOGS_MANAGER is refused refunding a payment and retrying its steps', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectCallsRefused(token, [CALLS.refundPayment, CALLS.retryPaymentSteps]);
    });
  });

  it('LC-03 LOGS_MANAGER is refused deleting telemetry, bugs and email logs', () => {
    asRole('LOGS_MANAGER', (token) => expectCallsRefused(token, LOG_DELETES));
  });
});
