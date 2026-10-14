import type { RunAccount } from '../../support/run-account';
import { searchTable, tableRow } from '../../support/tables';
import { expectTableEmpty, specMarker, staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Pod monitoring (AI) (/pod-monitoring): the audit trail of every
 * pod edit, status change and critical action. Read-only; the entry opened is
 * whichever staging lists first, and the spec says so when there is none.
 */

const AUDIT = 'PodAuditLogsTable';

interface AuditRow {
  id: string;
  pod_title: string | null;
  pod_id: string;
}

describe('Pods Portal · Pod monitoring (AI) (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'pods-monitoring');
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  it('PMN-01 an audit row opens its detail dialog, and a search nothing matches reads the empty line', () => {
    cy.interceptOperation(AUDIT);
    cy.visitPortal('pods', '/pod-monitoring');
    cy.byTestId('pod-monitoring-title').should('have.text', 'Pod Monitoring (AI)');
    cy.wait(`@${AUDIT}`).then(({ response }) => {
      expect(response?.body.errors, 'ALL_PODS_ACCESS reads the audit trail').to.be.undefined;
      const rows = (response?.body.data.podAuditLogsTable.rows ?? []) as AuditRow[];
      expect(rows, 'staging has recorded pod activity').to.have.length.greaterThan(0);
      const entry = rows[0];
      tableRow('pod-monitoring', entry.id, []).click(24, 16);
      cy.byTestId('pod-audit-dialog').should('be.visible');
      cy.byTestId('pod-audit-dialog-title').should('contain.text', entry.pod_title || entry.pod_id);
      cy.byTestId('pod-audit-dialog-close').click();
      cy.byTestId('pod-audit-dialog').should('not.exist');
    });

    searchTable(AUDIT, `${marker} nothing was ever done`);
    expectTableEmpty('No pod activity recorded yet.');
  });
});
