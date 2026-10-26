import {
  adminRun,
  fieldInput,
  openRunUser,
  releaseAdmin,
  signInAdmin,
  switchAdminRoles,
  type AdminRun,
} from '../../support/ui-admin-1';
import { ACCESS_DENIED, expectConfirm, specMarker } from '../../support/ui-staff';

/**
 * Admin › User Account Health: the Health tab of a member's details page
 * (UserHealthSection → HealthScoreCard / AdjustHealthDialog). A score starts at
 * 100; admins add, edit and delete signed adjustments (accountHealth.service.ts
 * — a non-zero whole delta within ±100), and SUPER_ADMIN / CITY_ADMIN alone may
 * read or write them.
 *
 * Every adjustment here is filed on the run account, carries the run's marker
 * as its remark, and is deleted by the spec itself.
 */

interface Adjustment {
  id: string;
  delta: number;
  remark: string;
}

interface Health {
  total_score: number;
  base_score: number;
  adjustments: Adjustment[];
}

const HEALTH = `query E2eAdminUserHealth($user_id: ID!) {
  userAccountHealth(user_id: $user_id) { total_score base_score adjustments { id delta remark } }
}`;

const health = (run: AdminRun): Cypress.Chainable<Health> =>
  cy.gql<{ userAccountHealth: Health }>(HEALTH, { user_id: run.profile.user_id }).its('userAccountHealth');

/** accountHealth.service.ts buildScore: the base plus every delta, clamped to 0–100. */
const scoreOf = (h: Health, deltas: readonly number[]): number =>
  Math.max(0, Math.min(100, h.base_score + deltas.reduce((sum, d) => sum + d, 0)));

const deltasOf = (h: Health, except = ''): number[] => h.adjustments.filter((a) => a.id !== except).map((a) => a.delta);

/** The card shows the score the server computes. */
function expectScore(run: AdminRun): Cypress.Chainable<Health> {
  return health(run).then((h) => {
    cy.byTestId('admin-user-health-total').should('have.text', String(h.total_score));
    cy.byTestId('admin-user-health-card').should('contain.text', `Final: ${h.total_score}/100`);
    return h;
  });
}

describe('Admin · User Account Health (City Admin)', { testIsolation: false }, () => {
  let run: AdminRun;
  let marker: string;
  let adjustmentId = '';

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
      marker = specMarker(r.account, 'admin-health');
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('UAH-01 the Health tab shows the server’s score and its adjustment history', () => {
    openRunUser(run, 'health');
    expectScore(run).then((h) => {
      if (h.adjustments.length === 0) {
        cy.byTestId('admin-user-health-empty').should('have.text', `No admin adjustments yet. Default score is ${h.base_score}.`);
      } else {
        for (const a of h.adjustments) cy.byTestId(`admin-user-health-row-${a.id}`).should('be.visible');
      }
    });
  });

  it('UAH-02 Adjust → Decrease 10 with a remark projects the score, saves it as a red "-10" row and recomputes', () => {
    openRunUser(run, 'health');
    health(run).then((before) => {
      cy.byTestId('admin-user-health-adjust').click();
      cy.byTestId('adjust-health-dialog').should('be.visible');
      cy.byTestId('adjust-health-minus').click();
      fieldInput('adjust-health-magnitude').clear().type('10');
      const projected = Math.max(0, Math.min(100, before.total_score - 10));
      cy.byTestId('adjust-health-magnitude').should('contain.text', `Applied as -10. Projected score: ${projected}/100.`);
      fieldInput('adjust-health-remark').type(marker, { delay: 0 });
      cy.interceptOperation('AdjustHealth');
      cy.byTestId('adjust-health-save').click();
      cy.wait('@AdjustHealth').then(({ response }) => {
        expect(response?.body.errors, 'adjustHealth answers without an error').to.be.undefined;
        const mine = (response?.body.data.adjustHealth.adjustments as Adjustment[]).find((a) => a.remark === marker);
        expect(mine?.delta, 'the saved delta').to.eq(-10);
        adjustmentId = String(mine?.id);
        cy.byTestId('adjust-health-dialog').should('not.exist');
        cy.byTestId(`admin-user-health-row-${adjustmentId}`).should('contain.text', '-10').and('contain.text', marker);
        expectScore(run).its('total_score').should('eq', scoreOf(before, [...deltasOf(before), -10]));
      });
    });
  });

  it('UAH-03 editing the adjustment swaps its old delta for the new one', () => {
    openRunUser(run, 'health');
    health(run).then((before) => {
      cy.byTestId(`admin-user-health-row-${adjustmentId}`).find('[data-testid="health-adjustment-edit"]').click();
      cy.byTestId('adjust-health-dialog').should('contain.text', 'Edit user health');
      fieldInput('adjust-health-magnitude').should('have.value', '10');
      fieldInput('adjust-health-remark').should('have.value', marker);
      fieldInput('adjust-health-magnitude').clear().type('4');
      const projected = Math.max(0, Math.min(100, before.total_score + 10 - 4));
      cy.byTestId('adjust-health-magnitude').should('contain.text', `Applied as -4. Projected score: ${projected}/100.`);
      cy.interceptOperation('EditAdjustment');
      cy.byTestId('adjust-health-save').click();
      cy.wait('@EditAdjustment').its('response.body.errors').should('be.undefined');
      cy.byTestId(`admin-user-health-row-${adjustmentId}`).should('contain.text', '-4');
      expectScore(run).its('total_score').should('eq', scoreOf(before, [...deltasOf(before, adjustmentId), -4]));
    });
  });

  it('UAH-04 a zero magnitude is refused in the dialog, and one over 100 is refused by the server; nothing is filed', () => {
    openRunUser(run, 'health');
    health(run).then((before) => {
      cy.byTestId('admin-user-health-adjust').click();
      fieldInput('adjust-health-magnitude').clear();
      cy.byTestId('adjust-health-save').click();
      cy.byTestId('adjust-health-error').should('have.text', 'Enter an adjustment between 1 and 100.');

      fieldInput('adjust-health-magnitude').clear().type('150');
      cy.interceptOperation('AdjustHealth');
      cy.byTestId('adjust-health-save').click();
      cy.wait('@AdjustHealth').its('response.body.errors.0.message').should('eq', 'Delta must be a non-zero integer between -100 and 100');
      cy.byTestId('adjust-health-error').should('have.text', 'Delta must be a non-zero integer between -100 and 100');
      cy.byTestId('adjust-health-dialog').should('be.visible');
      cy.byTestId('adjust-health-cancel').click();
      health(run).its('adjustments').should('have.length', before.adjustments.length);
    });
  });

  it('UAH-05 deleting the adjustment asks first, removes the row and recomputes without it', () => {
    openRunUser(run, 'health');
    health(run).then((before) => {
      cy.byTestId(`admin-user-health-row-${adjustmentId}`).find('[data-testid="health-adjustment-delete"]').click();
      expectConfirm('Delete adjustment');
      cy.interceptOperation('DeleteAdjustment');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@DeleteAdjustment').its('response.body.errors').should('be.undefined');
      cy.byTestId(`admin-user-health-row-${adjustmentId}`).should('not.exist');
      expectScore(run).its('total_score').should('eq', scoreOf(before, deltasOf(before, adjustmentId)));
    });
  });

  it('UAH-06 a Support Agent opens the member but is refused the health score: "Access Denied" in place of the card', () => {
    switchAdminRoles(run, ['CITY_ADMIN'], ['SUPPORT_USER']);
    signInAdmin(run);
    cy.interceptOperation('AdminUserAccountHealth');
    openRunUser(run, 'health');
    cy.wait('@AdminUserAccountHealth');
    cy.byTestId('admin-user-health-error').should('have.text', ACCESS_DENIED);
    cy.byTestId('admin-user-health-card').should('not.exist');
  });
});
