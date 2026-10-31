/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { NO_ID } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * Website portal › Career, Newsroom and Blog content (websiteContent) and
 * Website navigation (websiteNav), driven as CITY_ADMIN — a seat both
 * resolvers admit (WRITE_ROLES / ADMIN_ROLES) and the one a run account may hold.
 *
 * Each scenario writes only its own inert rows, named with the run's marker:
 * a Blog entry saved as a draft (`is_published: false`, so publicWebsiteContent
 * never serves it) and a hidden navigation link (`is_active: false`, so
 * publicWebsiteNav never serves it and no site build bakes it in). Both are
 * read back, edited, deleted, and swept again in `after()`.
 *
 * Scenario map: Website Portal › Career, Newsroom and Blog content; Website navigation.
 */

const CONTENT_FIELDS = 'id type title slug is_published sort_order category cta_url';
const CREATE_CONTENT = `mutation E2eCreateContent($input: WebsiteContentInput!) { createWebsiteContent(input: $input) { ${CONTENT_FIELDS} } }`;
const UPDATE_CONTENT = `mutation E2eUpdateContent($id: ID!, $input: WebsiteContentInput!) {
  updateWebsiteContent(content_id: $id, input: $input) { ${CONTENT_FIELDS} }
}`;
const DELETE_CONTENT = `mutation E2eDeleteContent($id: ID!) { deleteWebsiteContent(content_id: $id) }`;
const CONTENT_BY_TYPE = `query E2eContentByType($type: WebsitePageType) { websiteContent(type: $type) { id type } }`;
const PUBLIC_CONTENT = `query E2ePublicContent($type: WebsitePageType!) { publicWebsiteContent(type: $type) { id is_published } }`;
const CONTENT_SEARCH = `query E2eContentSearch($search: String) { websiteContentTable(query: { search: $search, page_size: 50 }) { rows { id title } } }`;

const NAV_FIELDS = 'id site area group_label label url sort_order is_active';
const CREATE_NAV = `mutation E2eCreateNav($input: WebsiteNavItemInput!) { createWebsiteNavItem(input: $input) { ${NAV_FIELDS} } }`;
const UPDATE_NAV = `mutation E2eUpdateNav($id: ID!, $input: WebsiteNavItemInput!) { updateWebsiteNavItem(item_id: $id, input: $input) { ${NAV_FIELDS} } }`;
const DELETE_NAV = `mutation E2eDeleteNav($id: ID!) { deleteWebsiteNavItem(item_id: $id) }`;
const NAV_BY_SITE = `query E2eNavBySite($site: WebsiteNavSite) { websiteNav(site: $site) { id site area } }`;
const PUBLIC_NAV = `query E2ePublicNav($site: WebsiteNavSite!) { publicWebsiteNav(site: $site) { id is_active } }`;
const NAV_SEARCH = `query E2eNavSearch($search: String) { websiteNavTable(query: { search: $search, page_size: 50 }) { rows { id label } } }`;

const slugify = (value: string): string =>
  value.toLowerCase().trim().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-+|-+$/g, '');

type Row = { id: string };
const ids = (rows: Row[]): string[] => rows.map((row) => row.id);

describe('API · Website content and navigation: a draft and a hidden link, round-tripped and never served', { testIsolation: false }, () => {
  const marker = (): string => runMarker(runAccount().stamp, 'mweb');
  let token = '';

  before(() => {
    signInRunMember();
    signInRunAs(['CITY_ADMIN']).then((t) => {
      token = t;
    });
  });

  after(() => {
    // Anything a failed scenario left behind, found by the run's stamp.
    const stamp = runAccount().stamp;
    cy.gql<{ websiteContentTable: { rows: Array<Row & { title: string }> } }>(CONTENT_SEARCH, { search: stamp }, { token }).then(
      ({ websiteContentTable }) =>
        websiteContentTable.rows
          .filter((row) => row.title.includes(stamp))
          .forEach((row) => cy.gql(DELETE_CONTENT, { id: row.id }, { token })),
    );
    cy.gql<{ websiteNavTable: { rows: Array<Row & { label: string }> } }>(NAV_SEARCH, { search: stamp }, { token }).then(
      ({ websiteNavTable }) =>
        websiteNavTable.rows.filter((row) => row.label.includes(stamp)).forEach((row) => cy.gql(DELETE_NAV, { id: row.id }, { token })),
    );
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('WCN-01 a Blog draft gets a slug from its title, lists under Blog only, and is never served publicly', () => {
    const title = `${marker()} blog draft`;
    cy.gql<{ createWebsiteContent: Row & { type: string; slug: string; is_published: boolean } }>(
      CREATE_CONTENT,
      {
        input: {
          type: 'BLOG',
          title,
          summary: 'An e2e draft nobody reads',
          body: 'Body of an e2e draft',
          category: 'E2E',
          cta_label: 'Start hosting',
          cta_url: 'https://duncit.com/earn',
          is_published: false,
        },
      },
      { token },
    ).then(({ createWebsiteContent: entry }) => {
      expect(entry.type).to.equal('BLOG');
      expect(entry.slug, 'a blank slug is generated from the title').to.equal(slugify(title));
      expect(entry.is_published, 'saved as a draft').to.equal(false);
      cy.gql<{ websiteContent: Row[] }>(CONTENT_BY_TYPE, { type: 'BLOG' }, { token }).then(({ websiteContent }) =>
        expect(ids(websiteContent), 'listed under Blog').to.include(entry.id),
      );
      ['CAREERS', 'NEWSROOM'].forEach((type) =>
        cy.gql<{ websiteContent: Row[] }>(CONTENT_BY_TYPE, { type }, { token }).then(({ websiteContent }) =>
          expect(ids(websiteContent), `not listed under ${type}`).to.not.include(entry.id),
        ),
      );
      cy.gql<{ publicWebsiteContent: Array<Row & { is_published: boolean }> }>(PUBLIC_CONTENT, { type: 'BLOG' }, { token: null }).then(
        ({ publicWebsiteContent }) => {
          expect(ids(publicWebsiteContent), 'a draft is never served').to.not.include(entry.id);
          publicWebsiteContent.forEach((row) => expect(row.is_published, 'the public feed holds published entries only').to.equal(true));
        },
      );
    });
  });

  it('WCN-02 a second entry with a slug the page type already holds is refused', () => {
    const title = `${marker()} blog draft`;
    cy.gqlRaw(CREATE_CONTENT, { input: { type: 'BLOG', title, is_published: false } }, { token }).then((body) =>
      expectRefused('createWebsiteContent', body, { code: 'CONFLICT', message: 'Slug already exists for this page type' }),
    );
  });

  it('WCN-03 editing keeps the draft unpublished with the new title and order; deleting it removes it once', () => {
    cy.gql<{ websiteContentTable: { rows: Array<Row & { title: string }> } }>(CONTENT_SEARCH, { search: runAccount().stamp }, { token }).then(
      ({ websiteContentTable }) => {
        const [entry] = websiteContentTable.rows.filter((row) => row.title.includes(runAccount().stamp));
        expect(entry, 'the draft WCN-01 saved').to.exist;
        const input = { type: 'BLOG', title: `${marker()} blog draft edited`, slug: slugify(`${marker()} blog draft`), is_published: false, sort_order: 7 };
        cy.gql<{ updateWebsiteContent: { title: string; is_published: boolean; sort_order: number } }>(
          UPDATE_CONTENT,
          { id: entry.id, input },
          { token },
        ).then(({ updateWebsiteContent }) => {
          expect(updateWebsiteContent.title).to.equal(input.title);
          expect(updateWebsiteContent.is_published, 'still a draft').to.equal(false);
          expect(updateWebsiteContent.sort_order).to.equal(7);
        });
        cy.gql<{ deleteWebsiteContent: boolean }>(DELETE_CONTENT, { id: entry.id }, { token }).its('deleteWebsiteContent').should('equal', true);
        cy.gql<{ deleteWebsiteContent: boolean }>(DELETE_CONTENT, { id: entry.id }, { token }).its('deleteWebsiteContent').should('equal', false);
        cy.gql<{ websiteContent: Row[] }>(CONTENT_BY_TYPE, { type: 'BLOG' }, { token }).then(({ websiteContent }) =>
          expect(ids(websiteContent), 'gone from Blog').to.not.include(entry.id),
        );
      },
    );
    cy.gqlRaw(UPDATE_CONTENT, { id: NO_ID, input: { type: 'BLOG', title: 'e2e none', is_published: false } }, { token }).then((body) =>
      expectRefused('updateWebsiteContent', body, { code: 'NOT_FOUND', message: 'Content not found' }),
    );
  });

  it('WCN-04 a hidden footer link lists under its site only, is never served, and moves with an edit', () => {
    const input = {
      site: 'PARTNERS',
      area: 'FOOTER',
      group_label: 'Support',
      label: `${marker()} help centre`,
      url: '/help',
      sort_order: 2,
      is_active: false,
    };
    cy.gql<{ createWebsiteNavItem: Row & typeof input }>(CREATE_NAV, { input }, { token }).then(({ createWebsiteNavItem: link }) => {
      expect(link).to.deep.include(input);
      cy.gql<{ websiteNav: Row[] }>(NAV_BY_SITE, { site: 'PARTNERS' }, { token }).then(({ websiteNav }) =>
        expect(ids(websiteNav), 'listed for partners.duncit.com').to.include(link.id),
      );
      cy.gql<{ websiteNav: Row[] }>(NAV_BY_SITE, { site: 'MAIN' }, { token }).then(({ websiteNav }) =>
        expect(ids(websiteNav), 'not listed for duncit.com').to.not.include(link.id),
      );
      cy.gql<{ publicWebsiteNav: Array<Row & { is_active: boolean }> }>(PUBLIC_NAV, { site: 'PARTNERS' }, { token: null }).then(
        ({ publicWebsiteNav }) => {
          expect(ids(publicWebsiteNav), 'a hidden link is never served').to.not.include(link.id);
          publicWebsiteNav.forEach((row) => expect(row.is_active, 'the public nav holds active links only').to.equal(true));
        },
      );
      const moved = { ...input, site: 'MAIN', area: 'HEADER' };
      cy.gql<{ updateWebsiteNavItem: typeof input }>(UPDATE_NAV, { id: link.id, input: moved }, { token }).then(
        ({ updateWebsiteNavItem }) => expect(updateWebsiteNavItem).to.deep.include(moved),
      );
      cy.gql<{ websiteNav: Row[] }>(NAV_BY_SITE, { site: 'MAIN' }, { token }).then(({ websiteNav }) =>
        expect(ids(websiteNav), 'now under duncit.com').to.include(link.id),
      );
      cy.gql<{ deleteWebsiteNavItem: boolean }>(DELETE_NAV, { id: link.id }, { token }).its('deleteWebsiteNavItem').should('equal', true);
      cy.gql<{ deleteWebsiteNavItem: boolean }>(DELETE_NAV, { id: link.id }, { token }).its('deleteWebsiteNavItem').should('equal', false);
    });
  });

  it('WCN-05 editing a link nobody has, or a malformed id, is refused', () => {
    const input = { site: 'MAIN', area: 'FOOTER', label: 'e2e none', url: '/none', is_active: false };
    cy.gqlRaw(UPDATE_NAV, { id: NO_ID, input }, { token }).then((body) =>
      expectRefused('updateWebsiteNavItem', body, { code: 'NOT_FOUND', message: 'Nav item not found' }),
    );
    cy.gqlRaw(UPDATE_NAV, { id: 'not-an-id', input }, { token }).then((body) =>
      expectRefused('updateWebsiteNavItem', body, { code: 'BAD_USER_INPUT', message: 'Invalid nav item id' }),
    );
  });
});
