import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable } from '../../support/tables';
import {
  ACCESS_DENIED,
  countOperation,
  expectConfirm,
  expectNotSent,
  expectRefused,
  expectTableEmpty,
  gqlRaw,
  pickOption,
  selectShows,
  specMarker,
  staffAccount,
  wideViewport,
} from '../../support/ui-staff';

/**
 * Pods Portal › Pod admin: All Pods (/pods), the pod editor (/pods/new,
 * /pods/:id/edit) and the pod record (/pods/:id), as ALL_PODS_ACCESS sees them.
 *
 * That role READS pods; every pod write (create, edit, delete, complete) is
 * refused to it on the server by design. So this spec never writes a pod:
 * filters, the New Pod chooser, the Delete confirmation (cancelled), the AI
 * activity trail, the legacy bookmark, the editor's own validation (refused
 * before anything is sent) and the record page — on whichever pods staging
 * lists first, failing with the reason when it lists none.
 */

const TABLE = 'admin-pods';
const PODS = 'PodsTable';
const ZERO_ID = '000000000000000000000000';

const PUBLIC_FLAGS = `query E2ePublicFeatureFlags { publicFeatureFlags { key enabled } }`;
const DELETE_POD = `mutation E2eDeletePod($id: ID!) { deletePod(pod_doc_id: $id) }`;

interface PodRow {
  id: string;
  pod_title: string;
}

/** All Pods, wide, and the first page of rows as the page received it. */
function openPods(): Cypress.Chainable<PodRow[]> {
  wideViewport();
  cy.interceptOperation(PODS);
  cy.visitPortal('pods', '/pods');
  return cy.wait(`@${PODS}`).then(({ response }) => {
    const rows = (response?.body.data.podsTable.rows ?? []) as PodRow[];
    expect(rows, 'staging lists at least one pod in All Pods').to.have.length.greaterThan(0);
    return rows;
  });
}

describe('Pods Portal · Pod admin (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let token = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'pods-admin');
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED')).then((t) => {
      token = t;
    });
  });

  it('PA-01 All Pods filters by lifecycle and club outside the table, and a search matching nothing reads "No pods yet."', () => {
    openTable('pods', '/pods', PODS);
    cy.byTestId('pods-list-title').should('have.text', 'Pods');
    selectShows('pods-lifecycle-filter', 'All Pods');

    pickOption('pods-lifecycle-filter', 'pods-lifecycle-option-UPCOMING');
    cy.wait(`@${PODS}`).its('request.body.variables.lifecycle').should('eq', 'UPCOMING');
    selectShows('pods-lifecycle-filter', 'Upcoming');

    cy.byTestId('pods-club-filter').find('[role="combobox"]').click();
    cy.byTestIdPrefix('pods-club-option-')
      .first()
      .invoke('attr', 'data-testid')
      .then((testId) => {
        const clubId = String(testId).replace('pods-club-option-', '');
        cy.byTestId(String(testId)).click();
        cy.location('search').should('contain', `club_id=${clubId}`);
        cy.wait(`@${PODS}`).its('response.body.errors').should('be.undefined');
      });

    searchTable(PODS, `${marker} no pod is called this`);
    expectTableEmpty('No pods yet.');
  });

  it('PA-02 Include cancelled lists cancelled pods for the Pods portal role', () => {
    openTable('pods', '/pods', PODS);
    pickOption('pods-lifecycle-filter', 'pods-lifecycle-option-CANCELLED');
    cy.wait(`@${PODS}`).its('response.body.data.podsTable.total').should('be.greaterThan', 0);
    cy.byTestId('pods-include-cancelled').find('input').should('be.checked');
  });

  it('PA-03 New Pod asks Normal or Auto when auto_pods is on, and opens the editor straight away when it is off', () => {
    cy.gql<{ publicFeatureFlags: { key: string; enabled: boolean }[] }>(PUBLIC_FLAGS).then(({ publicFeatureFlags }) => {
      const autoPods = publicFeatureFlags.find((flag) => flag.key === 'auto_pods')?.enabled === true;
      openTable('pods', '/pods', PODS);
      cy.byTestId('pods-new').click();
      if (!autoPods) {
        cy.byTestId('pod-kind-chooser').should('not.exist');
        cy.location('pathname').should('eq', '/pods/new');
        return;
      }
      cy.byTestId('pod-kind-chooser').should('be.visible');
      cy.byTestId('pod-kind-normal').click();
      cy.location('pathname').should('eq', '/pods/new');
      cy.byTestId('pod-form').should('exist');

      openTable('pods', '/pods', PODS);
      cy.byTestId('pods-new').click();
      cy.byTestId('pod-kind-auto').click();
      cy.location('pathname').should('eq', '/auto-pods/new');
    });
  });

  it('PA-04 Delete asks "Delete pod" and Cancel keeps the pod; the server refuses deletePod to this role', () => {
    openPods().then((rows) => {
      const pod = rows[0];
      const deletes = countOperation('DeletePod');
      cy.byTestId(`pod-delete-${pod.id}`).click();
      expectConfirm('Delete pod');
      cy.byTestId('confirm-dialog-message').should('have.text', `Delete pod "${pod.pod_title}"?`);
      cy.byTestId('confirm-dialog-cancel').click();
      cy.byTestId('confirm-dialog').should('not.exist');
      cy.byTestId(`${TABLE}-row-${pod.id}`).should('exist');
      expectNotSent(deletes, 'DeletePod');
    });
    // A pod nobody has: whatever the role guard decides, no real pod is at stake.
    gqlRaw('pods', DELETE_POD, { id: ZERO_ID }, token).then((body) => expectRefused(body, 'deletePod', ACCESS_DENIED));
  });

  it('PA-05 the AI Monitoring pill opens the pod’s activity without leaving the list, and the row opens the pod', () => {
    openPods().then((rows) => {
      const pod = rows[0];
      cy.interceptOperation('PodAuditLogs');
      cy.byTestId(`pod-ai-pill-${pod.id}`).click();
      cy.wait('@PodAuditLogs').its('response.body.errors').should('be.undefined');
      cy.byTestId('pod-activity-dialog').should('be.visible');
      cy.byTestId('pod-activity-title').should('have.text', `Activity · ${pod.pod_title}`);
      cy.location('pathname').should('eq', '/pods');
      cy.byTestId('pod-activity-close').click();
      cy.byTestId('pod-activity-dialog').should('not.exist');

      cy.byTestId(`${TABLE}-row-${pod.id}`).click(24, 16);
      cy.location('pathname').should('eq', `/pods/${pod.id}`);
    });
  });

  it('PA-06 an old /pods?edit=<id> bookmark is redirected to the editor page', () => {
    openPods().then((rows) => {
      cy.visitPortal('pods', `/pods?edit=${rows[0].id}`);
      cy.location('pathname').should('eq', `/pods/${rows[0].id}/edit`);
    });
  });

  it('PA-07 the editor refuses a short title and a missing club before anything is sent', () => {
    cy.visitPortal('pods', '/pods/new');
    const creates = countOperation('CreatePod');
    cy.byTestId('pod-form-title').type('ab', { delay: 0 });
    cy.byTestId('pod-form-save').click();
    cy.byTestId('pod-form').should('contain.text', 'Title is too short').and('contain.text', 'Select a club');
    cy.byTestId('pod-form-title').should('have.attr', 'aria-invalid', 'true');
    expectNotSent(creates, 'CreatePod');
  });

  it('PA-08 a virtual pod needs a meeting link, and the link must be an http(s) URL', () => {
    cy.visitPortal('pods', '/pods/new');
    const creates = countOperation('CreatePod');
    cy.byTestId('pod-mode-VIRTUAL').click().should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('pod-form-expand-all').click();
    cy.byTestId('pod-form-save').click();
    cy.byTestId('pod-form').should('contain.text', 'Meeting link is required');
    cy.byTestId('pod-form-meeting-url').type('zoom-meeting', { delay: 0 }).blur();
    cy.byTestId('pod-form-save').click();
    cy.byTestId('pod-form').should('contain.text', 'Meeting link must be a valid http(s) URL');
    expectNotSent(creates, 'CreatePod');
  });

  it('PA-09 an unknown pod reads "Pod not found." on its record and in the editor', () => {
    cy.visitPortal('pods', `/pods/${ZERO_ID}`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Pod not found.');
    cy.visitPortal('pods', `/pods/${ZERO_ID}/edit`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Pod not found.');
  });

  it('PA-10 a pod record shows its title, and Edit pod opens its editor', () => {
    openPods().then((rows) => {
      const pod = rows[0];
      cy.interceptOperation('AdminPodDetail');
      cy.visitPortal('pods', `/pods/${pod.id}`);
      cy.wait('@AdminPodDetail').its('response.body.errors').should('be.undefined');
      cy.byTestId('pod-details-title').should('have.text', pod.pod_title);
      cy.byTestId('pod-details-edit').should('have.text', 'Edit pod').click();
      cy.location('pathname').should('eq', `/pods/${pod.id}/edit`);
    });
  });

  it('PA-11 a healthy pod record renders no risk section and no risk error', () => {
    openPods().then((rows) => {
      cy.interceptOperation('PodCancellationRisk');
      cy.visitPortal('pods', `/pods/${rows[0].id}`);
      cy.wait('@PodCancellationRisk').its('response.body.errors').should('be.undefined');
      cy.byTestId('pod-risk-load-failed').should('not.exist');
    });
  });

  it('PA-12 the Offer codes table loads on a pod record', () => {
    openPods().then((rows) => {
      cy.interceptOperation('CouponsForPodTable');
      cy.visitPortal('pods', `/pods/${rows[0].id}`);
      cy.wait('@CouponsForPodTable').its('response.body.errors').should('be.undefined');
    });
  });
});
