import type { Interception } from 'cypress/types/net-stubbing';
import {
  TABLE_VIEWPORT,
  openRow,
  partnerWorld2,
  searchTable,
  signInRunPartner,
  tableRow,
  type PartnerWorld2,
} from '../../support/ui-partners-2';

/**
 * Partners › Pod monitoring (AI): /club-admin/monitoring, the Club Admin's
 * AI-monitored audit trail (clubAdminPodAuditLogsTable — pinned server-side to
 * the clubs the caller administers; searchable on pod title, actor and AI
 * summary, podAudit.service.ts).
 *
 * The run's club has a trail of its own: createPartnerPod records a CREATE
 * entry for every pod (pod.write.ts), so the fixture's free pod is always on it.
 */

const TABLE = 'club-admin-pod-monitoring';
const AUDIT_TABLE = `query E2eUiP2AuditRows($query: TableQueryInput) {
  clubAdminPodAuditLogsTable(query: $query) { rows { id pod_id action club_id } }
}`;

interface AuditRow {
  id: string;
  pod_id: string;
  action: string;
  club_id: string;
}

function openMonitoring(): Cypress.Chainable<Interception> {
  cy.viewport(...TABLE_VIEWPORT);
  cy.interceptOperation('ClubAdminPodAuditLogsTable');
  cy.visitApp('/club-admin/monitoring');
  return cy.wait('@ClubAdminPodAuditLogsTable');
}

describe('Partners UI · Pod monitoring (AI) (the run’s own club)', () => {
  let world: PartnerWorld2;
  let created: AuditRow;

  before(() => {
    signInRunPartner();
    partnerWorld2().then((found) => {
      world = found;
      cy.gql<{ clubAdminPodAuditLogsTable: { rows: AuditRow[] } }>(AUDIT_TABLE, {
        query: { search: found.freePod.title, page: 1, page_size: 100 },
      }).then(({ clubAdminPodAuditLogsTable }) => {
        const row = clubAdminPodAuditLogsTable.rows.find((log) => log.pod_id === found.freePod.id && log.action === 'CREATE');
        if (!row) throw new Error(`The free pod "${found.freePod.title}" has no CREATE entry on the club's audit trail.`);
        created = row;
      });
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('PM-01 Pod Monitoring (AI) lists only the run’s club’s activity, the free pod’s creation among it', () => {
    openMonitoring().then(({ response }) => {
      const rows: AuditRow[] = response?.body.data.clubAdminPodAuditLogsTable.rows ?? [];
      expect(rows.length, 'the club has a trail').to.be.greaterThan(0);
      rows.forEach((row) => expect(row.club_id, 'every entry is from the run’s club').to.equal(world.clubId));
    });
    cy.byTestId('clubs-hub').should('contain.text', 'Pod Monitoring (AI)');
    searchTable('ClubAdminPodAuditLogsTable', world.freePod.title);
    tableRow(TABLE, created.id, [world.freePod.title, 'Created']);
  });

  it('PM-02 searching a pod title narrows the trail to that pod', () => {
    openMonitoring();
    cy.byTestId('table-toolbar-search').should('be.enabled').type(world.freePod.title, { delay: 0 });
    // The second answer to the table's query: the one the search asked for.
    cy.wait('@ClubAdminPodAuditLogsTable').then(({ request, response }) => {
      expect(request.body.variables.query.search, 'the search sent').to.equal(world.freePod.title);
      const rows: AuditRow[] = response?.body.data.clubAdminPodAuditLogsTable.rows ?? [];
      expect(rows.map((row) => row.id), 'the creation entry').to.include(created.id);
      rows.forEach((row) => expect(row.pod_id, 'only the searched pod').to.equal(world.freePod.id));
    });
    tableRow(TABLE, created.id, [world.freePod.title]);
  });

  it('PM-03 an entry opens its detail — action, pod, AI risk and source — and Close dismisses it', () => {
    openMonitoring();
    searchTable('ClubAdminPodAuditLogsTable', world.freePod.title);
    openRow(TABLE, created.id, [world.freePod.title]);
    cy.byTestId('pod-audit-detail-title').should('have.text', `Created — ${world.freePod.title}`);
    cy.byTestId('pod-audit-detail').should('contain.text', 'AI risk:').and('contain.text', 'Changes (');
    cy.byTestId('pod-audit-detail-close').click();
    cy.byTestId('pod-audit-detail').should('not.exist');
  });
});
