/// <reference types="cypress" />
import { podPhase } from '@duncit/utils';
import { signInWithPassword } from '../../../support/account-steps';
import { signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';
import { isStranger, loadWorld, podWhere, type WorldPod } from '../../../support/ui-apps-1';

/**
 * Pod ratings — the standalone page behind a host's shared link
 * (/pod/:podId/feedback), live on staging. Only attendees the host marked
 * present may rate (bouncer.service.ts `getPodFeedbackForm` → `can_rate`); the
 * run account has been marked present nowhere, so it is told why, and a link
 * that names no pod is reported as one that cannot be opened.
 */

const NO_ACCESS =
  'You do not have access to this link because you have not joined this pod, or your attendance has not been marked by the host.';

describe('UI Pod ratings', () => {
  let pod: WorldPod;

  before(() => {
    signInRunMember();
    loadWorld().then((world) => {
      pod = podWhere(world, 'a past pod the run account neither hosted nor joined', (row) =>
        podPhase(row.pod_date_time, row.pod_end_date_time) === 'PREVIOUS' && isStranger(world, row),
      );
    });
  });

  it('RT-01 a rating link for a pod the member was not marked present at explains why and offers no form', () => {
    cy.interceptOperation('PodFeedbackForm');
    cy.visitApp(`/pod/${pod.id}/feedback`);
    cy.wait('@PodFeedbackForm').its('response.body.data.podFeedbackForm.can_rate').should('equal', false);
    cy.byTestId('pod-feedback-no-access').should('have.text', NO_ACCESS);
    cy.byTestId('pod-feedback-submit').should('not.exist');
  });

  it('RT-02 a rating link that names no pod cannot be opened', () => {
    cy.interceptOperation('PodFeedbackForm');
    cy.visitApp('/pod/e2e-not-a-pod/feedback');
    cy.wait('@PodFeedbackForm');
    cy.byTestId('pod-feedback-load-error').should('have.text', 'That pod could not be opened. Check the link and try again.');
  });

  it('RT-03 a signed-out guest is sent to sign in and brought back to the rating page', () => {
    const account = runAccount();
    const path = `/pod/${pod.id}/feedback`;
    signInWithPassword(account.email, account.password('CHANGED'), path);
    cy.location('pathname').should('eq', path);
    cy.byTestId('pod-feedback-no-access').should('be.visible');
  });
});
