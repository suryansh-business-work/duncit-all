import type { RunAccount } from '../../support/run-account';
import { pickOption, selectShows, staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Auto Pods (/auto-pods, /auto-pods/new, /auto-pods/:id): the
 * stage filter kept in the URL, the roll-out stepper's first rule, and the
 * details page. Auto Pods exist only while the `auto_pods` feature flag is on,
 * so `before()` reads the flag and fails with that reason when it is off.
 * Rolling out, pausing, cancelling or deleting an offer reaches every partner
 * in its category, and those writes are refused to ALL_PODS_ACCESS anyway —
 * none is attempted here.
 */

const PUBLIC_FLAGS = `query E2ePublicFeatureFlags { publicFeatureFlags { key enabled } }`;
const AUTO_PODS = 'AdminAutoPodsTable';
const FIRST_AUTO_POD = `query E2eFirstAutoPod { adminAutoPodsTable(query: { page: 1, page_size: 1 }) { rows { id } total } }`;

interface TableQuery {
  filters?: { field: string; op: string; value: unknown }[];
}

/** Whether the table query carries the stage filter. */
const filtersByStage = (query: TableQuery, stage: string): boolean =>
  (query.filters ?? []).some((f) => f.field === 'stage' && f.op === 'eq' && f.value === stage);

describe('Pods Portal · Auto Pods (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = staffAccount();
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
    cy.gql<{ publicFeatureFlags: { key: string; enabled: boolean }[] }>(PUBLIC_FLAGS).then(({ publicFeatureFlags }) => {
      const flag = publicFeatureFlags.find((f) => f.key === 'auto_pods');
      expect(flag?.enabled, 'the auto_pods feature flag is on (Tech › Feature Flags)').to.be.true;
    });
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  it('APD-01 the status filter rides in ?status=, survives a reload, and narrows the table to that stage', () => {
    cy.interceptOperation(AUTO_PODS);
    cy.visitPortal('pods', '/auto-pods');
    cy.wait(`@${AUTO_PODS}`);
    cy.byTestId('auto-pods-title').should('have.text', 'Auto Pods');
    selectShows('auto-pods-status-select', 'All statuses');

    pickOption('auto-pods-status-select', 'auto-pods-status-option-CLAIMING');
    cy.location('search').should('contain', 'status=CLAIMING');
    cy.wait(`@${AUTO_PODS}`).then(({ request, response }) => {
      const query = request.body.variables.query as TableQuery;
      expect(filtersByStage(query, 'CLAIMING'), 'the stage filter is sent').to.be.true;
      expect(response?.body.errors, 'ALL_PODS_ACCESS reads the Auto Pods table').to.be.undefined;
    });
    selectShows('auto-pods-status-select', 'Enrolling');

    cy.reload();
    cy.wait(`@${AUTO_PODS}`).then(({ request }) => {
      expect(filtersByStage(request.body.variables.query as TableQuery, 'CLAIMING'), 'still filtered after reload').to.be
        .true;
    });
    selectShows('auto-pods-status-select', 'Enrolling');
  });

  it('APD-02 the roll-out stepper will not leave "Pod category" until a category is picked', () => {
    cy.visitPortal('pods', '/auto-pods');
    cy.byTestId('auto-pods-new').click();
    cy.location('pathname').should('eq', '/auto-pods/new');
    cy.byTestId('auto-pod-stepper').should('be.visible');
    cy.byTestId('auto-pod-category').should('be.visible');
    cy.byTestId('auto-pod-next').should('be.disabled');
  });

  // An unknown id answers NOT_FOUND to every role, so only a real offer tells a
  // console reader apart from a caller the guard refuses.
  it('APD-03 an Auto Pod listed in the table opens its details page for the Pods portal role', () => {
    cy.gql<{ adminAutoPodsTable: { rows: { id: string }[]; total: number } }>(FIRST_AUTO_POD).then(({ adminAutoPodsTable }) => {
      expect(adminAutoPodsTable.total, 'staging holds at least one Auto Pod').to.be.greaterThan(0);
      cy.interceptOperation('AdminAutoPodDetails');
      cy.visitPortal('pods', `/auto-pods/${adminAutoPodsTable.rows[0].id}`);
      cy.wait('@AdminAutoPodDetails').its('response.body.errors').should('be.undefined');
      cy.byTestId('query-guard-error').should('not.exist');
      cy.byTestId('query-guard-not-found').should('not.exist');
    });
  });
});
