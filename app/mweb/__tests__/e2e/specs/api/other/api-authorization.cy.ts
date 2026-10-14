/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import {
  ACCESS_DENIED,
  expectRefused,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
} from '../../../support/access-steps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * API authorization for the Employee, Ads, AI, Challenge, Developers and
 * Website consoles: the server, not the hidden button, is the gate. Each
 * operation below was checked against its resolver — `requireRole` is the
 * FIRST statement, so the dummy id can only ever produce the auth refusal:
 *
 *   Employee   finance/employeeExpense/employeeExpense.resolver.ts EMPLOYEE_RW
 *   Ads        ads/ads.resolver.ts ADS_SUBMIT / ADS_SUBMIT_ANY
 *   AI         ai/prompt AI_RW, ai/automation AUTOMATION_ROLES, ai/reel REEL_ROLES
 *   Challenge  engagement/challenge RW, challenge/tools RW + MAPPING_RW
 *   Developers platform/apiKey/apiKey.resolver.ts API_KEY_MANAGE
 *   Website    content/cms CMS_ROLES, websiteContent WRITE_ROLES, websiteReel ADMIN_ROLES
 *
 * "Another staff role" is SUPPORT_MANAGER, which none of those lists holds
 * (CITY_ADMIN is not used: MAPPING_RW and the website lists include it).
 * Scenario map: Other › API authorization. The HR row has no operation to
 * test — the server has no HR-gated resolver (HR_MANAGER only opens the
 * console, portals/portal.constants.ts).
 */

interface GuardedOperation {
  id: string;
  field: string;
  query: string;
  variables?: Record<string, unknown>;
}

const byId = { id: NO_ID };
const op = (id: string, field: string, query: string, variables?: Record<string, unknown>): GuardedOperation => ({
  id,
  field,
  query,
  variables,
});

const AD_INPUT = `{ ad_title: "e2e", ad_description: "e2e", ad_type: IMAGE, media_url: "https://example.com/e2e.png",
  position: AUTO, start_at: "2099-01-01T00:00:00.000Z", duration_days: 1 }`;

const OPERATIONS: readonly GuardedOperation[] = [
  // Employee
  op('AZ-01', 'myEmployeeExpensesTable', `query E2eMyExpenses { myEmployeeExpensesTable(query: {}) { __typename } }`),
  op('AZ-02', 'deleteEmployeeExpense', `mutation E2eDeleteExpense($id: ID!) { deleteEmployeeExpense(expense_doc_id: $id) }`, byId),
  // Ads
  op('AZ-03', 'myAdRequestsTable', `query E2eMyAdRequests { myAdRequestsTable(query: {}) { __typename } }`),
  op('AZ-04', 'myAdsDashboard', `query E2eMyAdsDashboard { myAdsDashboard { __typename } }`),
  op('AZ-05', 'submitAdRequest', `mutation E2eSubmitAd { submitAdRequest(input: ${AD_INPUT}) { __typename } }`),
  // AI
  op('AZ-06', 'deleteAiPrompt', `mutation E2eDeletePrompt($id: ID!) { deleteAiPrompt(id: $id) }`, byId),
  op('AZ-07', 'deleteAutomationFlow', `mutation E2eDeleteFlow($id: ID!) { deleteAutomationFlow(id: $id) }`, byId),
  op('AZ-08', 'deleteReelProject', `mutation E2eDeleteReel($id: ID!) { deleteReelProject(id: $id) }`, byId),
  // Challenge
  op('AZ-09', 'deleteChallenge', `mutation E2eDeleteChallenge($id: ID!) { deleteChallenge(id: $id) }`, byId),
  op('AZ-10', 'updateChallengeTool', `mutation E2eUpdateTool($id: ID!) { updateChallengeTool(id: $id, input: {}) { __typename } }`, byId),
  op(
    'AZ-11',
    'upsertChallengeCategoryMapping',
    `mutation E2eUpsertMapping($id: ID!) { upsertChallengeCategoryMapping(category_id: $id, input: {}) { __typename } }`,
    byId,
  ),
  // Developers
  op('AZ-12', 'myApiKeys', `query E2eMyApiKeys { myApiKeys { __typename } }`),
  op('AZ-13', 'revokeApiKey', `mutation E2eRevokeApiKey($id: ID!) { revokeApiKey(id: $id) { __typename } }`, byId),
  op('AZ-14', 'createApiKey', `mutation E2eCreateApiKey { createApiKey(name: "e2e-refused") { __typename } }`),
  // Website
  op('AZ-15', 'deleteCmsSite', `mutation E2eDeleteSite($id: ID!) { deleteCmsSite(site_id: $id) }`, byId),
  op('AZ-16', 'deleteWebsiteContent', `mutation E2eDeleteContent($id: ID!) { deleteWebsiteContent(content_id: $id) }`, byId),
  op('AZ-17', 'deleteWebsiteReel', `mutation E2eDeleteWebsiteReel($id: ID!) { deleteWebsiteReel(reel_id: $id) }`, byId),
];

const OTHER_STAFF: readonly E2eStaffRole[] = ['SUPPORT_MANAGER'];
const ADS: readonly E2eStaffRole[] = ['ADS_MANAGER'];

const MY_AD_REQUESTS = `query E2eMyAdRequestsAllowed { myAdRequestsTable(query: {}) { total page } }`;

describe('API · Console operations refuse anonymous, member and other-staff callers', { testIsolation: false }, () => {
  let memberToken = '';
  let staffToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(OTHER_STAFF).then((token) => {
      staffToken = token;
    });
  });

  after(() => {
    revokeRunRoles([...OTHER_STAFF, ...ADS]);
  });

  OPERATIONS.forEach((guarded) => {
    it(`${guarded.id} ${guarded.field} refuses a signed-out caller, a member and another staff role`, () => {
      cy.gqlRaw(guarded.query, guarded.variables, { token: null }).then((body) =>
        expectRefused(guarded.field, body, SIGNED_OUT),
      );
      cy.gqlRaw(guarded.query, guarded.variables, { token: memberToken }).then((body) =>
        expectRefused(guarded.field, body, ACCESS_DENIED),
      );
      cy.gqlRaw(guarded.query, guarded.variables, { token: staffToken }).then((body) =>
        expectRefused(guarded.field, body, ACCESS_DENIED),
      );
    });
  });

  it('AZ-18 the role the Ads gate names is let through (the control for AZ-03)', () => {
    signInRunAs(ADS).then((adsToken) => {
      // cy.gql fails the scenario on any error, so reaching the assertions IS the pass.
      cy.gql<{ myAdRequestsTable: { total: number; page: number } }>(MY_AD_REQUESTS, {}, { token: adsToken }).then(
        ({ myAdRequestsTable }) => {
          // The run account has submitted nothing — AZ-05 refused it — so its own list is empty.
          expect(myAdRequestsTable.total).to.equal(0);
          expect(myAdRequestsTable.page).to.equal(1);
        },
      );
    });
  });
});
