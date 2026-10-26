import type { RunAccount } from '../../support/run-account';
import { openTable, searchTable, tableRow } from '../../support/tables';
import {
  UPDATE_POLICY_API,
  countOperation,
  createHiddenPolicy,
  deleteMarkedPolicies,
  expectConfirm,
  expectNotSent,
  expectNotify,
  expectTableEmpty,
  slugOf,
  specMarker,
  staffAccount,
  wideViewport,
} from '../../support/ui-staff';

/**
 * Legal › Policies (/policies): create, edit, change notice, wording history
 * and delete — every one on a policy this spec files itself, titled with its
 * marker and HIDDEN from the start. A policy that is active gates every new
 * signup on staging, so none of these is ever switched on. Nobody has accepted
 * them, which is what makes the change notice deterministic: it reaches no one.
 * `after()` deletes whatever is left.
 */

const TABLE = 'legal-policies';
const POLICIES = 'LegalPoliciesTable';

interface Created {
  id: string;
  title: string;
}

/** Policies, narrowed to one title, with its row on screen. */
function openPolicy(policy: Created): void {
  openTable('legal', '/policies', POLICIES);
  searchTable(POLICIES, policy.title);
  tableRow(TABLE, policy.id, [policy.title]);
}

describe('Legal · Policies (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'legal-policies');
  });

  beforeEach(() => {
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
    wideViewport();
  });

  after(() => {
    if (!marker) return;
    cy.apiPortalLogin('legal', account.email, account.password('CHANGED'));
    deleteMarkedPolicies(marker);
  });

  it('LP-01 New Policy fills the slug from the title, refuses a blank title, saves a hidden policy and refuses its slug twice', () => {
    const title = `${marker} Refund Policy`;
    openTable('legal', '/policies', POLICIES);
    cy.byTestId('page-header-title').should('have.text', 'Policies');

    cy.byTestId('policy-new').click();
    cy.byTestId('policy-form-title').should('have.text', 'New policy');
    cy.byTestId('policy-form-title-input').type(title, { delay: 0 });
    cy.byTestId('policy-form-slug').should('have.value', slugOf(title));

    // Blank title: the dialog says so and nothing reaches the server.
    const creates = countOperation('CreateLegalPolicy');
    cy.byTestId('policy-form-title-input').clear();
    cy.byTestId('policy-form-save').click();
    cy.byTestId('policy-form-error').should('have.text', 'Title is required');
    expectNotSent(creates, 'CreateLegalPolicy');

    cy.byTestId('policy-form-title-input').type(title, { delay: 0 });
    cy.byTestId('policy-form-active-label').should('contain.text', 'Active (visible in app)');
    cy.byTestId('policy-form-active').click();
    cy.byTestId('policy-form-active-label').should('contain.text', 'Hidden');
    cy.byTestId('policy-type-select').find('input').type('Refund Policy', { delay: 0 });
    // Close the type suggestions before Save, so they cover nothing.
    cy.byTestId('policy-form-slug').click();

    cy.interceptOperation('CreateLegalPolicy');
    cy.byTestId('policy-form-save').click();
    cy.wait('@CreateLegalPolicy').then(({ request, response }) => {
      expect(request.body.variables.input.is_active, 'saved hidden').to.be.false;
      expect(request.body.variables.input.slug, 'the auto slug').to.equal(slugOf(title));
      const id = response?.body.data.createPolicy.id as string;
      expectNotify('success', 'Policy created');
      cy.byTestId('policy-form-dialog').should('not.exist');
      searchTable(POLICIES, title);
      tableRow(TABLE, id, [title, slugOf(title)]);
      cy.byTestId(`policy-status-${id}`).should('have.text', 'Hidden');
    });

    // The same title again derives the same slug, which the server refuses.
    cy.byTestId('policy-new').click();
    cy.byTestId('policy-form-title-input').type(title, { delay: 0 });
    cy.byTestId('policy-form-active').click();
    cy.interceptOperation('CreateLegalPolicy', 'DuplicatePolicy');
    cy.byTestId('policy-form-save').click();
    cy.wait('@DuplicatePolicy').its('response.body.errors.0.message').should('eq', 'A policy with this slug already exists');
    cy.byTestId('policy-form-error').should('have.text', 'A policy with this slug already exists');
    cy.byTestId('policy-form-dialog').should('be.visible');
  });

  it('LP-02 Edit says nobody has accepted the policy, keeps the notice tick off, and saves a sort-order change', () => {
    createHiddenPolicy(`${marker} policy to edit`, '<p>Wording to edit.</p>').then((policy) => {
      openPolicy(policy);
      cy.byTestId(`policy-edit-${policy.id}`).click();
      cy.byTestId('policy-form-title').should('have.text', `Edit · ${policy.title}`);
      cy.byTestId('policy-notify-reach').should(
        'have.text',
        'Nobody has accepted this policy yet, so there is nobody to tell.',
      );
      cy.byTestId('policy-notify-checkbox').find('input').should('be.disabled').and('not.be.checked');
      cy.byTestId('policy-notify-last-sent').should('have.text', 'No change notice has been sent for this policy.');

      cy.byTestId('policy-form-sort').clear().type('7', { delay: 0 });
      cy.interceptOperation('UpdateLegalPolicy');
      cy.byTestId('policy-form-save').click();
      cy.wait('@UpdateLegalPolicy').then(({ request, response }) => {
        expect(response?.body.errors, 'the update is accepted').to.be.undefined;
        expect(request.body.variables.input.sort_order).to.equal(7);
        expect(request.body.variables.input.notify_accepted_users, 'no notice asked for').to.be.false;
      });
      expectNotify('success', 'Policy updated');
      cy.byTestId('policy-form-dialog').should('not.exist');
      // The edit dialog seeds from the refetched row, so it reads what was stored.
      tableRow(TABLE, policy.id, [policy.title]);
      cy.byTestId(`policy-edit-${policy.id}`).click();
      cy.byTestId('policy-form-sort').should('have.value', '7');
    });
  });

  it('LP-03 Send the notice now, on a policy nobody accepted, reports that nobody was written to', () => {
    createHiddenPolicy(`${marker} policy to notify`, '<p>Wording nobody accepted.</p>').then((policy) => {
      openPolicy(policy);
      cy.byTestId(`policy-notify-${policy.id}`).click();
      expectConfirm('Send the change notice?');
      cy.byTestId('confirm-dialog-message').should(
        'contain.text',
        `This emails everyone who has accepted “${policy.title}” that its wording has changed. It cannot be unsent.`,
      );
      cy.interceptOperation('NotifyLegalPolicyAcceptedUsers');
      cy.byTestId('confirm-dialog-confirm').should('have.text', 'Send the notice now').click();
      cy.wait('@NotifyLegalPolicyAcceptedUsers').its('response.body.data.notifyPolicyAcceptedUsers').should('eq', 0);
      expectNotify('success', 'Nobody has accepted this policy yet, so no notice was sent.');
      cy.byTestId('confirm-dialog').should('not.exist');
    });
  });

  it('LP-04 History lists every wording, newest marked In force now, and Read shows the exact earlier words', () => {
    const original = `Original wording ${marker}`;
    const changed = `Changed wording ${marker}`;
    createHiddenPolicy(`${marker} policy with history`, `<p>${original}</p>`).then((policy) => {
      openPolicy(policy);
      cy.interceptOperation('LegalPolicyVersions');
      cy.byTestId(`policy-history-${policy.id}`).click();
      cy.wait('@LegalPolicyVersions');
      cy.byTestId('policy-versions-dialog').should('contain.text', `Wording history · ${policy.title}`);
      // Never edited: the one wording there is, and it is the one in force.
      cy.byTestId('policy-version-1').should('contain.text', 'Version 1');
      cy.byTestId('policy-version-current-1').should('have.text', 'In force now');
      cy.byTestId('policy-version-2').should('not.exist');

      cy.gql(UPDATE_POLICY_API, { id: policy.id, input: { content: `<p>${changed}</p>` } });

      openPolicy(policy);
      cy.interceptOperation('LegalPolicyVersions');
      cy.byTestId(`policy-history-${policy.id}`).click();
      cy.wait('@LegalPolicyVersions');
      cy.byTestId('policy-version-current-2').should('have.text', 'In force now');
      cy.byTestId('policy-version-current-1').should('not.exist');
      cy.byTestId('policy-version-read-1').should('have.text', 'Read').click();
      cy.byTestId('policy-version-content-1').should('contain.text', original).and('not.contain.text', changed);
    });
  });

  it('LP-05 Delete asks first, says what is kept, and the policy leaves the table', () => {
    createHiddenPolicy(`${marker} policy to delete`, '<p>Wording to delete.</p>').then((policy) => {
      openPolicy(policy);
      cy.byTestId(`policy-delete-${policy.id}`).click();
      expectConfirm('Delete policy?');
      cy.byTestId('confirm-dialog-message').should(
        'contain.text',
        `This permanently deletes “${policy.title}”, its wording history and nothing else. The acceptance records stay.`,
      );
      cy.interceptOperation('DeleteLegalPolicy');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@DeleteLegalPolicy').its('response.body.data.deletePolicy').should('eq', true);
      expectNotify('success', 'Policy deleted');
      cy.byTestId(`${TABLE}-row-${policy.id}`).should('not.exist');
      openTable('legal', '/policies', POLICIES);
      searchTable(POLICIES, policy.title);
      expectTableEmpty('No policies yet.');
    });
  });
});
