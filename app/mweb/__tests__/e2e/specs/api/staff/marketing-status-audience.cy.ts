/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunAs, signInRunMember, type Refusal } from '../../../support/access-steps';
import type { GqlBody } from '../../../support/commands';
import { NO_ID } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * Marketing › Status (engagement/officialStatus) and Target Audience
 * (crm/marketing audienceList), driven as CITY_ADMIN — in both write gates
 * (MARKETING_WRITE / marketing ADMIN_ROLES) and the seat a run account may hold.
 *
 * Inert by construction: the status is saved switched OFF (is_active false),
 * so the public rail (officialStatuses) never carries it; the audience list
 * stores criteria only and is never sent to — its one filter is a search no
 * account matches, and the only person added by hand is the run account. Both
 * are read back, changed, deleted, and swept again in after().
 *
 * Scenario map: Marketing › Status, Target Audience.
 */

const STATUS_FIELDS = 'id title scope expiry: expires_at is_active is_live location_ids caption link_url';
const CREATE_STATUS = `mutation E2eCreateStatus($input: OfficialStatusInput!) { createOfficialStatus(input: $input) { ${STATUS_FIELDS} } }`;
const UPDATE_STATUS = `mutation E2eUpdateStatus($id: ID!, $input: OfficialStatusInput!) {
  updateOfficialStatus(status_doc_id: $id, input: $input) { ${STATUS_FIELDS} }
}`;
const DELETE_STATUS = `mutation E2eDeleteStatus($id: ID!) { deleteOfficialStatus(status_doc_id: $id) }`;
const STATUS_TABLE = `query E2eStatusTable($search: String) {
  officialStatusesTable(query: { search: $search, page_size: 20 }) { rows { id title view_count location_names is_live } }
}`;
const RAIL = `query E2eStatusRail { officialStatuses { id is_live } }`;

const LIST_FIELDS = 'id name owner member_count manual_member_count excluded_member_count search';
const ME = `query E2eAudienceMe { me { user_id } }`;
const CREATE_LIST = `mutation E2eCreateList($input: AudienceListInput!) { createAudienceList(input: $input) { ${LIST_FIELDS} } }`;
const ADD = `mutation E2eAddMembers($id: ID!, $users: [ID!]!) { addAudienceListMembers(id: $id, user_ids: $users) { ${LIST_FIELDS} } }`;
const REMOVE = `mutation E2eRemoveMember($id: ID!, $user: ID!) { removeAudienceListMember(id: $id, user_id: $user) { ${LIST_FIELDS} } }`;
const DELETE_LIST = `mutation E2eDeleteList($id: ID!) { deleteAudienceList(id: $id) }`;
const ONE_LIST = `query E2eOneList($id: ID!) { audienceList(id: $id) { ${LIST_FIELDS} } }`;
const MEMBERS = `query E2eListMembers($id: ID!) { audienceListMembersTable(list_id: $id, query: { page_size: 5 }) { total rows { id } } }`;
const LISTS = `query E2eLists($search: String) { audienceListsTable(query: { search: $search, page_size: 20 }) { rows { id name } } }`;

const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });
const DAY = 24 * 60 * 60 * 1000;

/** A `validate()` refusal: "Validation failed" with the rule in extensions.errors. */
function expectRule(field: string, body: GqlBody, rule: string): void {
  const [error] = (body.errors ?? []) as Array<{ message: string; extensions?: { code?: string; errors?: string[] } }>;
  expect(error?.extensions?.code, `${field} code`).to.equal('BAD_USER_INPUT');
  expect(error?.message, `${field} message`).to.equal('Validation failed');
  expect(error?.extensions?.errors, `${field} rules`).to.include(rule);
  expect(body.data?.[field] ?? null, `${field} data`).to.be.null;
}

describe('API · Marketing status and audience lists, kept out of every app and every send', { testIsolation: false }, () => {
  const marker = (): string => runMarker(runAccount().stamp, 'mweb');
  let token = '';
  let me = '';

  const status = (overrides: Record<string, unknown> = {}) => ({
    title: `${marker()} status`,
    media_url: 'https://duncit.com/duncit-logo.svg',
    media_type: 'IMAGE',
    caption: 'An e2e status nobody sees',
    link_url: '/pod-ideas',
    scope: 'GLOBAL',
    expiry: 'NEVER',
    is_active: false,
    ...overrides,
  });

  before(() => {
    signInRunMember();
    signInRunAs(['CITY_ADMIN']).then((t) => {
      token = t;
      cy.gql<{ me: { user_id: string } }>(ME, {}, { token: t }).then((data) => {
        me = data.me.user_id;
      });
    });
  });

  after(() => {
    const stamp = runAccount().stamp;
    cy.gql<{ officialStatusesTable: { rows: Array<{ id: string; title: string }> } }>(STATUS_TABLE, { search: stamp }, { token }).then(
      ({ officialStatusesTable }) =>
        officialStatusesTable.rows.filter((r) => r.title.includes(stamp)).forEach((r) => cy.gql(DELETE_STATUS, { id: r.id }, { token })),
    );
    cy.gql<{ audienceListsTable: { rows: Array<{ id: string; name: string }> } }>(LISTS, { search: stamp }, { token }).then(
      ({ audienceListsTable }) =>
        audienceListsTable.rows.filter((r) => r.name.includes(stamp)).forEach((r) => cy.gql(DELETE_LIST, { id: r.id }, { token })),
    );
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('MSA-01 a status breaking a rule is refused before it is saved', () => {
    const past = new Date(Date.now() - DAY).toISOString();
    cy.gqlRaw(CREATE_STATUS, { input: status({ link_url: 'http://duncit.com' }) }, { token }).then((body) =>
      expectRule('createOfficialStatus', body, 'Use an in-app path such as /pod-ideas, or a full https:// address'),
    );
    cy.gqlRaw(CREATE_STATUS, { input: status({ scope: 'LOCATION', location_ids: [] }) }, { token }).then((body) =>
      expectRule('createOfficialStatus', body, 'Pick at least one city'),
    );
    cy.gqlRaw(CREATE_STATUS, { input: status({ expiry: 'CUSTOM' }) }, { token }).then((body) =>
      expectRule('createOfficialStatus', body, 'Pick the date and time it expires'),
    );
    cy.gqlRaw(CREATE_STATUS, { input: status({ expiry: 'CUSTOM', custom_expires_at: past }) }, { token }).then((body) =>
      expectRefused('createOfficialStatus', body, bad('The expiry date and time must be in the future')),
    );
    cy.gqlRaw(CREATE_STATUS, { input: status({ scope: 'LOCATION', location_ids: [NO_ID] }) }, { token }).then((body) =>
      expectRefused('createOfficialStatus', body, bad('One of the chosen cities no longer exists')),
    );
  });

  it('MSA-02 a switched-off status is saved, never in the rail, edits to a custom expiry, and deletes once', () => {
    cy.gql<{ createOfficialStatus: { id: string; expiry: string | null; is_active: boolean; is_live: boolean; location_ids: string[] } }>(
      CREATE_STATUS,
      { input: status() },
      { token },
    ).then(({ createOfficialStatus: saved }) => {
      expect(saved.expiry, 'NEVER stores no expiry').to.be.null;
      expect(saved.is_active).to.equal(false);
      expect(saved.is_live, 'off is never live').to.equal(false);
      expect(saved.location_ids, 'a global status names no city').to.be.empty;
      cy.gql<{ officialStatuses: Array<{ id: string; is_live: boolean }> }>(RAIL, {}, { token: null }).then(({ officialStatuses }) => {
        expect(officialStatuses.map((s) => s.id), 'the rail never carries it').to.not.include(saved.id);
        officialStatuses.forEach((s) => expect(s.is_live, 'the rail holds live statuses only').to.equal(true));
      });
      cy.gql<{ officialStatusesTable: { rows: Array<{ id: string; view_count: number; is_live: boolean }> } }>(
        STATUS_TABLE,
        { search: runAccount().stamp },
        { token },
      ).then(({ officialStatusesTable }) => {
        const row = officialStatusesTable.rows.find((r) => r.id === saved.id);
        expect(row, 'listed for Marketing').to.exist;
        expect(row?.view_count, 'nobody has watched it').to.equal(0);
      });
      const expires = new Date(Date.now() + 2 * DAY);
      expires.setMilliseconds(0);
      cy.gql<{ updateOfficialStatus: { expiry: string; is_live: boolean } }>(
        UPDATE_STATUS,
        { id: saved.id, input: status({ expiry: 'CUSTOM', custom_expires_at: expires.toISOString() }) },
        { token },
      ).then(({ updateOfficialStatus }) => {
        expect(updateOfficialStatus.expiry, 'the picked date is kept').to.equal(expires.toISOString());
        expect(updateOfficialStatus.is_live, 'still off').to.equal(false);
      });
      cy.gql<{ deleteOfficialStatus: boolean }>(DELETE_STATUS, { id: saved.id }, { token }).its('deleteOfficialStatus').should('equal', true);
      cy.gqlRaw(DELETE_STATUS, { id: saved.id }, { token }).then((body) =>
        expectRefused('deleteOfficialStatus', body, { code: 'NOT_FOUND', message: 'Status not found' }),
      );
    });
  });

  it('MSA-03 an audience list needs a name and an owner', () => {
    cy.gqlRaw(CREATE_LIST, { input: { name: ' ', owner: 'E2E run' } }, { token }).then((body) =>
      expectRefused('createAudienceList', body, bad('List name is required')),
    );
    cy.gqlRaw(CREATE_LIST, { input: { name: `${marker()} list`, owner: ' ' } }, { token }).then((body) =>
      expectRefused('createAudienceList', body, bad('List owner is required')),
    );
  });

  it('MSA-04 a list matching nobody holds exactly who is added by hand, and keeps out who is removed', () => {
    const input = { name: `${marker()} list`, description: 'e2e', owner: 'E2E run', search: `zq${runAccount().stamp}nobodyzq` };
    cy.gql<{ createAudienceList: { id: string; member_count: number; search: string } }>(CREATE_LIST, { input }, { token }).then(
      ({ createAudienceList: list }) => {
        expect(list.search).to.equal(input.search);
        expect(list.member_count, 'its search matches nobody').to.equal(0);
        cy.gql<{ addAudienceListMembers: { member_count: number; manual_member_count: number } }>(ADD, { id: list.id, users: [me] }, { token }).then(
          ({ addAudienceListMembers }) => {
            expect(addAudienceListMembers.manual_member_count).to.equal(1);
            expect(addAudienceListMembers.member_count, 'the one person added').to.equal(1);
          },
        );
        cy.gql<{ addAudienceListMembers: { manual_member_count: number } }>(ADD, { id: list.id, users: [me] }, { token })
          .its('addAudienceListMembers.manual_member_count')
          .should('equal', 1);
        cy.gql<{ audienceListMembersTable: { total: number; rows: Array<{ id: string }> } }>(MEMBERS, { id: list.id }, { token }).then(
          ({ audienceListMembersTable }) => {
            expect(audienceListMembersTable.total).to.equal(1);
            expect(audienceListMembersTable.rows.map((r) => r.id)).to.deep.equal([me]);
          },
        );
        cy.gql<{ removeAudienceListMember: { member_count: number; manual_member_count: number; excluded_member_count: number } }>(
          REMOVE,
          { id: list.id, user: me },
          { token },
        ).then(({ removeAudienceListMember }) => {
          expect(removeAudienceListMember.manual_member_count).to.equal(0);
          expect(removeAudienceListMember.excluded_member_count, 'kept out by hand').to.equal(1);
          expect(removeAudienceListMember.member_count).to.equal(0);
        });
        cy.gqlRaw(ADD, { id: list.id, users: [] }, { token }).then((body) =>
          expectRefused('addAudienceListMembers', body, bad('Select at least one person to add')),
        );
        cy.gqlRaw(ADD, { id: list.id, users: [NO_ID] }, { token }).then((body) =>
          expectRefused('addAudienceListMembers', body, bad('None of those accounts exist any more')),
        );
        cy.gql<{ deleteAudienceList: boolean }>(DELETE_LIST, { id: list.id }, { token }).its('deleteAudienceList').should('equal', true);
        cy.gql<{ audienceList: unknown }>(ONE_LIST, { id: list.id }, { token }).then(({ audienceList }) => expect(audienceList, 'the deleted list').to.be.null);
        cy.gqlRaw(DELETE_LIST, { id: list.id }, { token }).then((body) =>
          expectRefused('deleteAudienceList', body, { code: 'NOT_FOUND', message: 'Audience list not found' }),
        );
      },
    );
  });
});
