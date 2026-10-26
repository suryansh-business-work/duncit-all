/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { foreignPod, marked, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Host - cancel pod — only the pod's host may cancel it. Scenario map: Apps ›
 * Host - cancel pod ("Cancel refused for ended pods and non-hosts").
 *
 * hostDeletePod loads the pod and checks the host first
 * (pod.cancellation.ts hostRemove → findHostedPod), before the reason is read
 * and long before any refund. The reason sent is not one of the configured
 * delete reasons, so a broken guard would still stop at "Select a valid delete
 * reason" and never cancel the real pod.
 */

const CANCEL = `mutation E2eHostDeletePod($id: ID!, $subject: String!) {
  hostDeletePod(pod_doc_id: $id, reason_subject: $subject)
}`;

describe('API · Only its host can cancel a pod', { testIsolation: false }, () => {
  let memberToken = '';
  let podId = '';
  const subject = marked('not-a-delete-reason');

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignPod(token, id).then((pod) => {
          podId = pod.id;
        }),
      );
    });
  });

  it('HC-01 cancelling a pod is refused to a signed-out caller', () => {
    cy.gqlRaw(CANCEL, { id: podId, subject }, { token: null }).then((body) =>
      expectRefused('hostDeletePod', body, SIGNED_OUT),
    );
  });

  it('HC-02 a member who does not host the pod cannot cancel it', () => {
    cy.gqlRaw(CANCEL, { id: podId, subject }, { token: memberToken }).then((body) =>
      expectRefused('hostDeletePod', body, refusal('FORBIDDEN', 'Only the pod host can manage this pod')),
    );
  });

  it('HC-03 cancelling a pod that does not exist answers "Pod not found"', () => {
    cy.gqlRaw(CANCEL, { id: NO_ID, subject }, { token: memberToken }).then((body) =>
      expectRefused('hostDeletePod', body, refusal('NOT_FOUND', 'Pod not found')),
    );
  });

  it('HC-04 an id that is not an id is refused as invalid', () => {
    cy.gqlRaw(CANCEL, { id: 'not-a-pod', subject }, { token: memberToken }).then((body) =>
      expectRefused('hostDeletePod', body, refusal('BAD_USER_INPUT', 'Invalid pod id')),
    );
  });
});
