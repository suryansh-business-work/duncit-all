import type { RunAccount } from '../../support/run-account';
import { countOperation, expectNotSent } from '../../support/ui-staff';
import {
  eq,
  findMeeting,
  onboardingAccount,
  openMeetingActions,
  openMeetingRow,
  releaseOnboarding,
  signInOnboarding,
} from '../../support/ui-onboarding';

/**
 * Onboarding · Applicant approval: the Approve / Deny step a DONE meeting
 * offers (src/pages/meetings/DecisionDialog.tsx → decideMeeting).
 *
 * Approving drafts a real host, venue, brand or club admin and grants roles;
 * denying asks a real applicant to re-apply. At the Staff portals step the run
 * account owns no application yet (its venue/host fixtures come later, in the
 * mweb_fixtures step), so this spec stops at the dialog's own validation and
 * proves DecideMeeting is never sent.
 */

describe('Onboarding · Applicant approval (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = onboardingAccount();
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  it('OAA-01 a done, undecided meeting offers only Approve / Deny, and the decision needs feedback before Approve or Deny is sent', () => {
    findMeeting([eq('status', 'DONE'), eq('approval_status', 'NONE')], 'done and still undecided').then((row) => {
      const decisions = countOperation('DecideMeeting');
      openMeetingRow(row);
      openMeetingActions(row);
      cy.byTestId('meeting-action-decide').should('be.visible');
      cy.byTestId('meeting-action-schedule').should('not.exist');
      cy.byTestId('meeting-action-reschedule').should('not.exist');
      cy.byTestId('meeting-action-decide').click();

      cy.byTestId('meeting-decision-dialog').should('contain.text', 'Approve or deny onboarding');
      cy.byTestId('meeting-decision-approve').click();
      cy.byTestId('meeting-decision-error').should('have.text', 'Add your feedback before deciding.');
      cy.byTestId('meeting-decision-deny').click();
      cy.byTestId('meeting-decision-error').should('have.text', 'Add your feedback before deciding.');

      cy.byTestId('meeting-decision-cancel').click();
      cy.byTestId('meeting-decision-dialog').should('not.exist');
      expectNotSent(decisions, 'DecideMeeting');
    });
  });

  it('OAA-02 a decided meeting offers no further action', () => {
    findMeeting([eq('status', 'DONE'), { field: 'approval_status', op: 'in', values: ['APPROVED', 'DENIED'] }], 'already decided').then(
      (row) => {
        openMeetingRow(row);
        cy.byTestId(`meeting-actions-none-${row.id}`).should('have.text', '—');
      },
    );
  });
});
