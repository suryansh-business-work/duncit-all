/// <reference types="cypress" />
import { AUTH_REQUIRED, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { expectAnswer, expectEachRefused } from '../../../support/api-partners';

/**
 * Host dashboard (/host/dashboard) and host onboarding (/become-host) — the
 * dashboard is computed for the token's own account only
 * (venues/partnerDashboard: no user argument), and the onboarding steps write
 * the caller's own application. Signed out, neither answers. The host's pod
 * operations are specs/api/apps/host-*.cy.ts.
 * Scenario map: Partners › Host dashboard, Host onboarding.
 */

const DASHBOARD = `query E2eHostDashboard($from: String!, $to: String!) {
  partnerDashboard(from: $from, to: $to) { host { number_of_pods host_earning } }
}`;
const STEP1 = `mutation E2eHostStep1($input: HostStep1Input!) { submitHostStep1(input: $input) { __typename } }`;
const FINAL = `mutation E2eHostFinal { submitHostFinal { __typename } }`;

const range = () => {
  const to = new Date();
  return { from: new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: to.toISOString() };
};

describe('API · The host studio answers for the caller’s own hosting only', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('HS-01 the host dashboard is refused signed out and counts nothing for a member who never hosted', () => {
    expectEachRefused('partnerDashboard', DASHBOARD, range(), [[null, SIGNED_OUT]]);
    cy.gqlRaw(DASHBOARD, range(), { token: memberToken }).then((body) =>
      expectAnswer('partnerDashboard', body, { host: { number_of_pods: 0, host_earning: 0 } }),
    );
  });

  it('HS-02 a dashboard range that ends before it starts is refused', () => {
    const { from, to } = range();
    expectEachRefused('partnerDashboard', DASHBOARD, { from: to, to: from }, [
      [memberToken, { code: 'BAD_USER_INPUT', message: 'From date must be before to date' }],
    ]);
  });

  it('HS-03 the host application cannot be written or submitted signed out', () => {
    const input = { full_name: 'E2E', email: 'nobody@example.com', phone: '0000000000' };
    expectEachRefused('submitHostStep1', STEP1, { input }, [[null, AUTH_REQUIRED]]);
    expectEachRefused('submitHostFinal', FINAL, {}, [[null, AUTH_REQUIRED]]);
  });
});
