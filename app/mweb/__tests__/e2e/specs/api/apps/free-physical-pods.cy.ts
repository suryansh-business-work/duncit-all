/// <reference types="cypress" />
import { AUTH_REQUIRED, expectRefused, signInRunMember } from '../../../support/access-steps';
import { foreignPod, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Free physical pods — "cancel my spot" exists only on a free pod; a paid one
 * is left through Backout. Scenario map: Apps › Free physical pods
 * ("Cancel-spot refusals").
 *
 * podMember.service.ts loadFreePodForCancel loads the pod and refuses a paid
 * one with NOT_FREE_POD before it looks for the caller's booking, so the call
 * is safe to aim at a real paid pod the member is not in.
 */

const CANCEL_SPOT = `mutation E2eCancelFreeSpot($pod: ID!) { cancelFreeSpot(pod_doc_id: $pod) { id } }`;

describe('API · Only a free pod’s spot can be cancelled', { testIsolation: false }, () => {
  let memberToken = '';
  let paidPodId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignPod(token, id, 'PAID').then((pod) => {
          paidPodId = pod.id;
        }),
      );
    });
  });

  it('FP-01 cancelling a spot is refused to a signed-out caller', () => {
    cy.gqlRaw(CANCEL_SPOT, { pod: paidPodId }, { token: null }).then((body) =>
      expectRefused('cancelFreeSpot', body, AUTH_REQUIRED),
    );
  });

  it('FP-02 a paid pod’s spot cannot be cancelled — Backout is the way out', () => {
    cy.gqlRaw(CANCEL_SPOT, { pod: paidPodId }, { token: memberToken }).then((body) =>
      expectRefused(
        'cancelFreeSpot',
        body,
        refusal('NOT_FREE_POD', 'Only a free pod’s spot can be cancelled. Use Backout to leave a paid pod.'),
      ),
    );
  });

  it('FP-03 cancelling a spot on a pod that does not exist answers "Pod not found"', () => {
    cy.gqlRaw(CANCEL_SPOT, { pod: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('cancelFreeSpot', body, refusal('NOT_FOUND', 'Pod not found')),
    );
    cy.gqlRaw(CANCEL_SPOT, { pod: 'not-a-pod' }, { token: memberToken }).then((body) =>
      expectRefused('cancelFreeSpot', body, refusal('NOT_FOUND', 'Pod not found')),
    );
  });
});
