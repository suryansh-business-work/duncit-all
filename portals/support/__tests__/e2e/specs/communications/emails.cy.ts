import type { RunAccount } from '../../support/run-account';
import { consoleAccount, expectFirstRow, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Communications › Emails (/emails/dashboard, /emails/logs), as a
 * COMMUNICATIONS_MANAGER seat. Read-only: nothing is sent, deleted or edited.
 *
 * The dashboard's repeat-failures card lists only addresses that failed at
 * least twice (`repeat_failures`). The logs page offers "Delete all" only to
 * SUPER_ADMIN (`isSuperAdmin` in email-logs-page/index.tsx;
 * `deleteAllEmailLogs` is SUPER_ADMIN-only on the server), so this seat never
 * sees it.
 */

interface Dashboard {
  attempts: number;
  sent: number;
  failed: number;
  repeat_failures: { address: string; failures: number }[];
}

describe('Communications · Emails (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('communications');
  });

  beforeEach(() => {
    signIn('communications', account);
  });

  after(() => {
    releaseConsoleRole(account, 'communications');
  });

  it('MEM-01 /emails opens the dashboard, whose repeat failures are only addresses that failed twice or more', () => {
    visitAndRead<{ emailLogDashboard: Dashboard }>('communications', '/emails', 'EmailLogDashboard').then(
      ({ emailLogDashboard: d }) => {
        cy.location('pathname').should('eq', '/emails/dashboard');
        expect(d.sent + d.failed, 'sent and failed are attempts').to.be.at.most(d.attempts);
        for (const row of d.repeat_failures) expect(row.failures, row.address).to.be.at.least(2);
      },
    );
  });

  it('MEM-02 the email log loads for this seat, with no "Delete all" — that is SUPER_ADMIN\'s alone', () => {
    visitAndRead<{ emailLogsTable: { rows: { id: string }[] } }>('communications', '/emails/logs', 'EmailLogsTable').then(
      ({ emailLogsTable }) => {
        expectFirstRow('tech-email-logs', emailLogsTable.rows, (r) => r.id);
        cy.byTestId('email-log-filter-all').should('be.visible');
        cy.byTestId('email-logs-delete-all').should('not.exist');
      },
    );
  });
});
