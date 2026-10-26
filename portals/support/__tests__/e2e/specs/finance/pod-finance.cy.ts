import type { RunAccount } from '../../support/run-account';
import { ZERO_ID, consoleAccount, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Finance › Pod Finance (/pod-finance, /pod-finance/:podId), as the analyst
 * seat (FINANCE_USER). Read-only.
 *
 * The list groups every payout release request by its pod (row id = pod_id,
 * PodFinancePage.tsx); a pod opens its money waterfall from
 * `podFinanceBreakdown` (POD_BREAKDOWN_READ takes FINANCE_READER). An id no pod
 * carries answers "Pod not found" (breakdown.service.ts).
 */

const TABLE = 'finance-pod-finance';

interface Release {
  id: string;
  pod_id: string;
  pod_title: string;
}

describe('Finance · Pod Finance (run account, password CHANGED)', () => {
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

  it('FPF-01 releases are grouped by pod, and a pod opens its money waterfall', () => {
    visitAndRead<{ paymentReleaseRequests: Release[] }>('finance', '/pod-finance', 'PodFinanceReleases').then(
      ({ paymentReleaseRequests }) => {
        expect(paymentReleaseRequests, 'staging holds a payout release request').to.have.length.greaterThan(0);
        const [release] = paymentReleaseRequests;
        if (!release) return;
        cy.interceptOperation('PodFinanceBreakdown');
        cy.byTestId(`${TABLE}-row-${release.pod_id}`).first().should('contain.text', release.pod_title).click(24, 16);
        cy.location('pathname').should('eq', `/pod-finance/${release.pod_id}`);
        cy.wait('@PodFinanceBreakdown').then(({ response }) => {
          expect(response?.body.errors, 'the analyst reads the breakdown').to.be.undefined;
          const breakdown = response?.body.data.podFinanceBreakdown as { pod_id: string; pod_title: string };
          expect(breakdown.pod_id, 'the breakdown is the opened pod').to.equal(release.pod_id);
          cy.byTestId('pod-finance-title').should('have.text', breakdown.pod_title);
        });
      },
    );
  });

  it('FPF-02 an id no pod carries reads "Pod not found"', () => {
    cy.interceptOperation('PodFinanceBreakdown');
    cy.visitPortal('finance', `/pod-finance/${ZERO_ID}`);
    cy.wait('@PodFinanceBreakdown').its('response.body.errors.0.message').should('eq', 'Pod not found');
    cy.byTestId('query-guard-error').should('contain.text', 'Pod not found');
    cy.byTestId('pod-finance-title').should('not.exist');
  });
});
