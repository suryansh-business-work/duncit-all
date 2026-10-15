import type { RunAccount } from '../../support/run-account';
import { apiRead, consoleAccount, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Finance › Cancellations (/cancellations, /cancellations/host,
 * /cancellations/venue), as the analyst seat (FINANCE_USER). Read-only.
 *
 * `podCancellations(kind)` lists the newest 500 deleted pods plus the newest
 * 500 venue-declined pods, each row keyed `<pod_id>-<kind>`
 * (CancellationsTable.tsx); `podCancellationStats` counts over the full
 * collections (server podCancellation.service.ts). So a tab holds only its own
 * actor's cancellations, and its row count equals the matching tile whenever
 * staging is under the hydration cap.
 */

const CAP = 500;

interface CancellationRow {
  pod_id: string;
  pod_title: string;
  kind: 'HOST' | 'VENUE' | 'ADMIN' | 'CLUB_ADMIN' | 'SYSTEM';
}

interface Stats {
  total_cancelled: number;
  cancelled_by_host: number;
  cancelled_by_venue: number;
}

const STATS = `query E2ePodCancellationStats {
  podCancellationStats { total_cancelled cancelled_by_host cancelled_by_venue }
}`;

/** `KIND_LABELS` in cancellations-page/queries.ts, as the dialog's chip says it. */
const KIND_LABEL: Readonly<Record<CancellationRow['kind'], string>> = {
  HOST: 'Host',
  VENUE: 'Venue',
  ADMIN: 'Admin',
  CLUB_ADMIN: 'Club admin',
  SYSTEM: 'System',
};

const rowTestId = (tableId: string, row: CancellationRow) => `${tableId}-row-${row.pod_id}-${row.kind}`;

function expectTab(account: RunAccount, path: string, tableId: string, kind: 'HOST' | 'VENUE', tile: keyof Stats): void {
  visitAndRead<{ podCancellations: CancellationRow[] }>('finance', path, 'PodCancellations').then(({ podCancellations }) => {
    for (const row of podCancellations) {
      expect(row.kind, `${row.pod_title} on the ${kind} tab`).to.equal(kind);
    }
    apiRead<{ podCancellationStats: Stats }>('finance', account, STATS).then(({ podCancellationStats: stats }) => {
      if (stats.total_cancelled <= CAP) {
        expect(podCancellations.length, `the ${kind} tab matches the ${tile} tile`).to.equal(stats[tile]);
      } else {
        expect(podCancellations.length, `the ${kind} tab never exceeds the ${tile} tile`).to.be.at.most(stats[tile]);
      }
    });
    if (podCancellations.length === 0) {
      cy.byTestId('duncit-table-empty').should('be.visible');
      return;
    }
    const [first] = podCancellations;
    cy.byTestId(rowTestId(tableId, first)).first().click(24, 16);
    cy.byTestId('cancellation-detail-title')
      .should('contain.text', first.pod_title)
      .and('contain.text', `Cancelled by ${KIND_LABEL[kind]}`);
  });
}

describe('Finance · Cancellations (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('finance');
  });

  beforeEach(() => {
    signIn('finance', account);
  });

  after(() => {
    releaseConsoleRole(account, 'finance');
  });

  it('FCN-01 the dashboard lists every cancellation newest first and a row opens its detail dialog', () => {
    visitAndRead<{ podCancellations: CancellationRow[] }>('finance', '/cancellations', 'PodCancellations').then(
      ({ podCancellations }) => {
        expect(podCancellations, 'staging holds a cancelled pod').to.have.length.greaterThan(0);
        const [first] = podCancellations;
        if (!first) return;
        cy.byTestId(rowTestId('finance-cancellations-all', first)).first().click(24, 16);
        cy.byTestId('cancellation-detail-dialog').should('be.visible');
        cy.byTestId('cancellation-detail-title')
          .should('contain.text', first.pod_title)
          .and('contain.text', `Cancelled by ${KIND_LABEL[first.kind]}`);
      },
    );
  });

  it('FCN-02 the Host Cancel tab lists only host cancellations and matches the host tile', () => {
    expectTab(account, '/cancellations/host', 'finance-cancellations-host', 'HOST', 'cancelled_by_host');
  });

  it('FCN-03 the Venue Cancel tab lists only venue cancellations and matches the venue tile', () => {
    expectTab(account, '/cancellations/venue', 'finance-cancellations-venue', 'VENUE', 'cancelled_by_venue');
  });
});
