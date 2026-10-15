import type { RunAccount } from '../../support/run-account';
import { searchTable, tableRow } from '../../support/tables';
import { releaseConsoleRole, signIn, soleConsoleAccount, visitAndRead } from '../../support/ui-finance-crm';
import { specMarker } from '../../support/ui-staff';

/**
 * Logs › Pod monitoring (/pod-monitoring): the Pods console's audit trail
 * (@duncit/entity-consoles PodMonitoringPage), mounted in Logs. The account
 * holds LOGS_MANAGER only — ALL_PODS_ACCESS would open the trail by itself —
 * so the read answering proves LOGS_READER on `podAuditLogsTable`
 * (podAudit.resolver.ts). Read-only.
 */

const AUDIT = 'PodAuditLogsTable';

interface AuditRow {
  id: string;
  pod_title: string | null;
  pod_id: string;
}

describe('Logs · Pod monitoring (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = soleConsoleAccount('logs');
  });

  beforeEach(() => {
    signIn('logs', account);
  });

  after(() => {
    releaseConsoleRole(account, 'logs');
  });

  it('LPM-01 a LOGS_MANAGER seat reads the pod audit trail and opens an entry', () => {
    visitAndRead<{ podAuditLogsTable: { rows: AuditRow[] } }>('logs', '/pod-monitoring', AUDIT).then(({ podAuditLogsTable }) => {
      cy.byTestId('pod-monitoring-title').should('have.text', 'Pod Monitoring (AI)');
      const [entry] = podAuditLogsTable.rows;
      expect(entry, 'staging has recorded pod activity').to.exist;
      if (!entry) return;
      tableRow('pod-monitoring', entry.id, []).click(24, 16);
      cy.byTestId('pod-audit-dialog').should('be.visible');
      cy.byTestId('pod-audit-dialog-title').should('contain.text', entry.pod_title || entry.pod_id);
      cy.byTestId('pod-audit-dialog-close').click();
      cy.byTestId('pod-audit-dialog').should('not.exist');
    });
  });

  it('LPM-02 a search nothing matches reads the empty line', () => {
    visitAndRead('logs', '/pod-monitoring', AUDIT);
    searchTable(AUDIT, `${specMarker(account, 'logs-monitoring')} nothing was ever done`);
    cy.byTestId('duncit-table-empty').should('have.text', 'No pod activity recorded yet.');
  });
});
