import type { RunAccount } from '../../support/run-account';
import {
  ZERO_ID,
  consoleAccount,
  expectApiRefused,
  releaseConsoleRole,
  signIn,
  visitAndRead,
} from '../../support/ui-finance-crm';

/**
 * Finance › Payment Release (/payment-release, /payment-release/:requestId),
 * as the analyst seat (FINANCE_USER).
 *
 * The queue has one row per pod request; a request opens every payout on it
 * (`podPaymentRelease`, FINANCE_READ). Approving the pod's payouts and
 * reviewing one release are ADMIN_RW writes that credit host, venue and club
 * admin wallets — the four-way split is a FINANCE_MANAGER scenario this run
 * never holds. The analyst is refused both, probed with an id no request carries.
 */

const TABLE = 'finance-pod-payment-releases';

interface PodRequest {
  id: string;
  pod_title: string;
  release_count: number;
}

interface PodRelease {
  podPaymentRelease: {
    summary: { id: string; release_count: number };
    releases: { kind: string }[];
  };
}

const APPROVE_POD_RELEASE = `mutation E2eApprovePodPaymentRelease($id: ID!) {
  approvePodPaymentRelease(id: $id) { summary { id } }
}`;

const REVIEW_RELEASE = `mutation E2eReviewPaymentRelease($id: ID!, $input: ReviewPaymentReleaseInput!) {
  reviewPaymentReleaseRequest(request_id: $id, input: $input) { id }
}`;

describe('Finance · Payment Release (run account, password CHANGED)', () => {
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

  it('FPR-01 a pod request opens with every payout it groups', () => {
    visitAndRead<{ podPaymentReleasesTable: { rows: PodRequest[] } }>('finance', '/payment-release', 'PodPaymentReleasesTable').then(
      ({ podPaymentReleasesTable }) => {
        const [request] = podPaymentReleasesTable.rows;
        expect(request, 'staging holds a pod payout request').to.exist;
        if (!request) return;
        cy.interceptOperation('PodPaymentRelease');
        cy.byTestId(`${TABLE}-row-${request.id}`).first().should('contain.text', request.pod_title).click(24, 16);
        cy.location('pathname').should('eq', `/payment-release/${encodeURIComponent(request.id)}`);
        cy.wait('@PodPaymentRelease').then(({ response }) => {
          expect(response?.body.errors, 'the analyst reads the request').to.be.undefined;
          const detail = (response?.body.data as PodRelease).podPaymentRelease;
          expect(detail.releases, 'the request lists every payout it counts').to.have.length(request.release_count);
          for (const release of detail.releases) cy.byTestId(`release-payout-${release.kind}`).should('be.visible');
        });
      },
    );
  });

  it('FPR-02 approving a pod\'s payouts or reviewing one release is refused to the analyst', () => {
    expectApiRefused('finance', account, APPROVE_POD_RELEASE, { id: ZERO_ID }, 'approvePodPaymentRelease');
    expectApiRefused(
      'finance',
      account,
      REVIEW_RELEASE,
      { id: ZERO_ID, input: { status: 'REJECTED', approval_reason: 'e2e refusal probe' } },
      'reviewPaymentReleaseRequest',
    );
  });
});
