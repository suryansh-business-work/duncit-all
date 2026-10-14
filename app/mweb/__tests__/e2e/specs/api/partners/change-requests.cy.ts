/// <reference types="cypress" />
import { ACCESS_DENIED, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Change requests — a partner asks Duncit to replace them on a pod
 * (/host/change-requests), and the Pods console finds the replacement
 * (/pods/change-requests). The partner side is `requireAuth` only and the
 * service decides from the pod itself whether the caller holds that place
 * (pods/podChangeRequest); the console side is the platform admins'
 * (`ADMIN_ROLES`). Scenario map: Partners › Change requests.
 * ALL_PODS_ACCESS on the console side: specs/api/partners/pods-console-pages.cy.ts.
 */

const BOARD = `query E2eChangeBoard { myPodChangeBoard { mine { id } incoming { id } } }`;
const REQUEST = `mutation E2eRequestPodChange($id: ID!) { requestPodChange(pod_doc_id: $id, role: HOST, reason: "e2e") { id } }`;
const WITHDRAW = `mutation E2eWithdrawPodChange($id: ID!) { withdrawPodChange(request_id: $id) { id } }`;
const RESPOND = `mutation E2eRespondPodChange($id: ID!) { respondToPodChange(request_id: $id, decision: APPROVE) { id } }`;
const QUEUE = `query E2eChangeQueue { podChangeRequests(role: HOST, query: { page_size: 1 }) { __typename } }`;
const OFFER = `mutation E2eOfferPodChange($input: OfferPodChangeInput!) { offerPodChange(input: $input) { id } }`;
const CANCEL_FOR_CHANGE = `mutation E2eCancelForChange($id: ID!) {
  cancelPodForChange(request_id: $id, reason: "e2e") { __typename }
}`;

const REQUEST_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Change request not found' };

describe('API · Change requests move only for the partner holding the place, and Duncit staff', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('CR-01 the change board is refused signed out and empty for a member who holds no place on a pod', () => {
    expectEachRefused('myPodChangeBoard', BOARD, {}, [[null, SIGNED_OUT]]);
    cy.gqlRaw(BOARD, {}, { token: memberToken }).then((body) => {
      expect(body.errors, 'myPodChangeBoard errors').to.be.undefined;
      const board = body.data?.myPodChangeBoard as { mine: unknown[]; incoming: unknown[] };
      expect(board.mine, 'requests the member filed').to.deep.equal([]);
      expect(board.incoming, 'offers made to the member').to.deep.equal([]);
    });
  });

  it('CR-02 a change cannot be filed for a pod that does not exist', () => {
    expectEachRefused('requestPodChange', REQUEST, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, { code: 'NOT_FOUND', message: 'Pod not found' }],
    ]);
  });

  it('CR-03 a request that is not the member’s cannot be withdrawn or answered', () => {
    expectEachRefused('withdrawPodChange', WITHDRAW, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, REQUEST_NOT_FOUND],
    ]);
    expectEachRefused('respondToPodChange', RESPOND, { id: NO_ID }, [
      [null, SIGNED_OUT],
      [memberToken, REQUEST_NOT_FOUND],
    ]);
  });

  it('CR-04 the console queue, offers and change cancellations are refused to a member', () => {
    expectEachRefused('podChangeRequests', QUEUE, {}, [
      [null, SIGNED_OUT],
      [memberToken, ACCESS_DENIED],
    ]);
    expectEachRefused('offerPodChange', OFFER, { input: { request_id: NO_ID, user_id: NO_ID } }, [
      [memberToken, ACCESS_DENIED],
    ]);
    expectEachRefused('cancelPodForChange', CANCEL_FOR_CHANGE, { id: NO_ID }, [[memberToken, ACCESS_DENIED]]);
  });
});
