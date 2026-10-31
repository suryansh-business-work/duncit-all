/// <reference types="cypress" />
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunMember, type Refusal } from '../../../support/access-steps';
import { asRole, NO_ID } from '../../../support/api-staff';

/**
 * CRM › a lead's Survey, Website and Manual Logs tabs — survey/leadSurvey
 * (public /s/:token page and the CRM side), crm/websitePage and
 * crm/crm addCrmManualLog — all CRM_RW (SUPER_ADMIN, CRM_MANAGER) apart from
 * the two public token operations.
 *
 * Every lead is a real business, so no lead is written: the CRM side is driven
 * to the refusals its services answer before any write — an empty log body, a
 * lead or entry nobody has — and the public page to its "invalid or revoked"
 * answer for a token no link carries. (Writing a survey link, scraping a site
 * or logging a note needs a lead this run owns; see the run report.)
 *
 * Scenario map: CRM › Lead survey, website, reminders and logs.
 */

const BY_TOKEN = `query E2eSurveyByToken($token: String!) { leadSurveyByToken(token: $token) { lead_name already_filled } }`;
const SUBMIT_BY_TOKEN = `mutation E2eSubmitByToken($token: String!) { submitLeadSurveyByToken(token: $token, answers: []) }`;
const LEAD_SURVEY = `query E2eLeadSurvey($entity: LeadSurveyEntity!, $id: ID!) { leadSurvey(entity: $entity, lead_id: $id) { entries { id } } }`;
const ENTRIES = `query E2eSurveyEntries($id: ID!) { leadSurveyEntriesTable(entity: VENUE_LEAD, lead_id: $id) { total } }`;
const REVOKE = `mutation E2eRevokeLink($id: ID!) { revokeLeadSurveyLink(entry_id: $id) }`;
const DELETE_ENTRY = `mutation E2eDeleteEntry($id: ID!) { deleteLeadSurveyEntry(entry_id: $id) }`;
const MANUAL_LOG = `mutation E2eManualLog($input: ManualLogInput!) { addCrmManualLog(input: $input) { __typename } }`;
const PAGES = `query E2eLeadPages($id: ID!) { crmWebsitePages(entity_type: VENUE_LEAD, lead_id: $id) { id } }`;

const REVOKED: Refusal = { code: 'NOT_FOUND', message: 'This survey link is invalid or has been revoked' };
const notFound = (message: string): Refusal => ({ code: 'NOT_FOUND', message });
const NO_TOKEN = 'e2e-no-such-survey-token';

describe('API · A lead’s survey link, website and manual log refuse what is not there', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['CRM_MANAGER', 'CITY_ADMIN']);
  });

  it('CLT-01 the public survey page answers "invalid or revoked" for a token no link carries, on read and on submit', () => {
    cy.gqlRaw(BY_TOKEN, { token: NO_TOKEN }, { token: null }).then((body) => expectRefused('leadSurveyByToken', body, REVOKED));
    cy.gqlRaw(SUBMIT_BY_TOKEN, { token: NO_TOKEN }, { token: null }).then((body) =>
      expectRefused('submitLeadSurveyByToken', body, REVOKED),
    );
  });

  it('CLT-02 the CRM seat is told a lead or survey entry nobody has is not found', () => {
    asRole('CRM_MANAGER', (token) => {
      ['VENUE_LEAD', 'HOST_LEAD'].forEach((entity) =>
        cy.gqlRaw(LEAD_SURVEY, { entity, id: NO_ID }, { token }).then((body) => expectRefused('leadSurvey', body, notFound('Lead not found'))),
      );
      cy.gqlRaw(ENTRIES, { id: NO_ID }, { token }).then((body) =>
        expectRefused('leadSurveyEntriesTable', body, notFound('Lead not found')),
      );
      cy.gqlRaw(REVOKE, { id: NO_ID }, { token }).then((body) => expectRefused('revokeLeadSurveyLink', body, notFound('Entry not found')));
      cy.gqlRaw(DELETE_ENTRY, { id: NO_ID }, { token }).then((body) => expectRefused('deleteLeadSurveyEntry', body, notFound('Entry not found')));
    });
  });

  it('CLT-03 a manual log needs a body before the lead is even looked up, and names the lead kind it could not find', () => {
    asRole('CRM_MANAGER', (token) => {
      cy.gqlRaw(MANUAL_LOG, { input: { entity_type: 'VENUE_LEAD', entity_id: NO_ID, body_html: '   ' } }, { token }).then((body) =>
        expectRefused('addCrmManualLog', body, { code: 'BAD_USER_INPUT', message: 'Log body is required' }),
      );
      cy.gqlRaw(MANUAL_LOG, { input: { entity_type: 'VENUE_LEAD', entity_id: NO_ID, body_html: '<p>e2e</p>' } }, { token }).then((body) =>
        expectRefused('addCrmManualLog', body, notFound('Venue lead not found')),
      );
      cy.gqlRaw(MANUAL_LOG, { input: { entity_type: 'HOST_LEAD', entity_id: NO_ID, body_html: '<p>e2e</p>' } }, { token }).then((body) =>
        expectRefused('addCrmManualLog', body, notFound('Host lead not found')),
      );
    });
  });

  it('CLT-04 a member and CITY_ADMIN are refused a lead’s survey, website pages and manual log', () => {
    const refuse = (token: string) => {
      cy.gqlRaw(LEAD_SURVEY, { entity: 'VENUE_LEAD', id: NO_ID }, { token }).then((body) => expectRefused('leadSurvey', body, ACCESS_DENIED));
      cy.gqlRaw(PAGES, { id: NO_ID }, { token }).then((body) => expectRefused('crmWebsitePages', body, ACCESS_DENIED));
      cy.gqlRaw(MANUAL_LOG, { input: { entity_type: 'VENUE_LEAD', entity_id: NO_ID, body_html: '<p>e2e</p>' } }, { token }).then((body) =>
        expectRefused('addCrmManualLog', body, ACCESS_DENIED),
      );
      cy.gqlRaw(REVOKE, { id: NO_ID }, { token }).then((body) => expectRefused('revokeLeadSurveyLink', body, ACCESS_DENIED));
    };
    refuse(memberToken);
    asRole('CITY_ADMIN', refuse);
  });
});
