/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { foreignPod, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Social safety — reporting a profile files a report only with a reason Legal
 * has configured, and never against yourself. Scenario map: Apps › Social
 * safety ("Report a profile").
 *
 * report.profile.ts profileReportSnapshot reads the reported account first;
 * report.service.ts submit then refuses a report on your own account and a
 * reason that is not an active category (reportCategory.service.ts
 * requireActive) before anything is written. The other member reported here is
 * the host of a listed pod, with a reason no category has — so no report is
 * ever filed against a real person.
 */

const REPORT = `mutation E2eReportProfile($user: ID!, $reason: String!) {
  reportProfile(user_id: $user, reason: $reason) { __typename }
}`;

const NO_SUCH_REASON = 'E2E_NO_SUCH_REASON';

describe('API · A profile report needs a real reason and another member', { testIsolation: false }, () => {
  let memberToken = '';
  let ownId = '';
  let otherMemberId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) => {
        ownId = id;
        foreignPod(token, id).then((pod) => {
          [otherMemberId] = pod.pod_hosts_id;
        });
      });
    });
  });

  it('RP-01 reporting a profile is refused to a signed-out caller', () => {
    cy.gqlRaw(REPORT, { user: NO_ID, reason: NO_SUCH_REASON }, { token: null }).then((body) =>
      expectRefused('reportProfile', body, SIGNED_OUT),
    );
  });

  it('RP-02 a member cannot report their own profile', () => {
    cy.gqlRaw(REPORT, { user: ownId, reason: NO_SUCH_REASON }, { token: memberToken }).then((body) =>
      expectRefused('reportProfile', body, refusal('BAD_USER_INPUT', 'You cannot report your own content')),
    );
  });

  it('RP-03 a profile that does not exist cannot be reported', () => {
    cy.gqlRaw(REPORT, { user: NO_ID, reason: NO_SUCH_REASON }, { token: memberToken }).then((body) =>
      expectRefused('reportProfile', body, refusal('NOT_FOUND', 'User not found')),
    );
    cy.gqlRaw(REPORT, { user: 'not-a-user', reason: NO_SUCH_REASON }, { token: memberToken }).then((body) =>
      expectRefused('reportProfile', body, refusal('BAD_USER_INPUT', 'Invalid user')),
    );
  });

  it('RP-04 a report on another member needs a reason from the configured categories', () => {
    cy.gqlRaw(REPORT, { user: otherMemberId, reason: NO_SUCH_REASON }, { token: memberToken }).then((body) =>
      expectRefused('reportProfile', body, refusal('BAD_USER_INPUT', 'Pick a reason for the report')),
    );
  });
});
