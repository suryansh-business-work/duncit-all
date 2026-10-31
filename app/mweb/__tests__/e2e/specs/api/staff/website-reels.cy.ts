/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { runAccount } from '../../../support/run-account';

/**
 * Website portal › Website reels: the Reel Slider each marketing site shows
 * (content/websiteReel). CITY_ADMIN is in its ADMIN_ROLES and is the seat a
 * run account may hold.
 *
 * What a site serves is publicWebsiteReels: its ACTIVE reels in slider order,
 * capped at `max_reels` (websiteReel.service.ts publicList) — checked here
 * against the admin table for every site. The run's own reel is created
 * HIDDEN (`is_active: false`, which skips the cap check and never reaches a
 * slider), read back, edited and deleted. Where a site already holds its
 * maximum, an active reel is refused before it is saved (`assertRoomFor`).
 * The reels settings are only read, never changed.
 *
 * Scenario map: Website Portal › Website reels.
 */

const SITES = ['MAIN', 'PARTNERS', 'ADS', 'EARNWITH'] as const;
const REEL_FIELDS = 'id site title description video_url sort_order is_active';
const SETTINGS = `query E2eReelSettings { websiteReelSettings { max_reels max_reel_mb } }`;
const PUBLIC_REELS = `query E2ePublicReels($site: WebsiteNavSite!) { publicWebsiteReels(site: $site) { id is_active } }`;
const ADMIN_REELS = `query E2eAdminReels($query: TableQueryInput) { websiteReelsTable(query: $query) { total rows { id title } } }`;
const CREATE = `mutation E2eCreateReel($input: WebsiteReelInput!) { createWebsiteReel(input: $input) { ${REEL_FIELDS} } }`;
const UPDATE = `mutation E2eUpdateReel($id: ID!, $input: WebsiteReelInput!) { updateWebsiteReel(reel_id: $id, input: $input) { ${REEL_FIELDS} } }`;
const DELETE = `mutation E2eDeleteReel($id: ID!) { deleteWebsiteReel(reel_id: $id) }`;

const activeOn = (site: string, pageSize: number) => ({
  query: {
    page_size: pageSize,
    filters: [
      { field: 'site', op: 'eq', value: site },
      { field: 'is_active', op: 'is_true' },
    ],
  },
});

type Row = { id: string; title?: string };

describe('API · Website reels: what each slider serves, and a hidden reel round-tripped', { testIsolation: false }, () => {
  let token = '';
  let maxReels = 0;
  const title = (): string => `${runMarker(runAccount().stamp, 'mweb')} reel`;
  // A video address no site will ever play: the reel stays hidden for its whole life.
  const VIDEO = 'https://duncit.com/e2e-reel-never-served.mp4';

  before(() => {
    signInRunMember();
    signInRunAs(['CITY_ADMIN']).then((t) => {
      token = t;
      cy.gql<{ websiteReelSettings: { max_reels: number } }>(SETTINGS, {}, { token: t }).then(({ websiteReelSettings }) => {
        maxReels = websiteReelSettings.max_reels;
      });
    });
  });

  after(() => {
    const stamp = runAccount().stamp;
    cy.gql<{ websiteReelsTable: { rows: Row[] } }>(ADMIN_REELS, { query: { search: stamp, page_size: 50 } }, { token }).then(
      ({ websiteReelsTable }) =>
        websiteReelsTable.rows
          .filter((row) => String(row.title).includes(stamp))
          .forEach((row) => cy.gql(DELETE, { id: row.id }, { token })),
    );
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('WR-01 every site’s slider is exactly its first active reels in slider order, never more than the maximum', () => {
    expect(maxReels, 'max reels per site').to.be.at.least(1);
    SITES.forEach((site) => {
      cy.gql<{ websiteReelsTable: { rows: Row[] } }>(ADMIN_REELS, activeOn(site, maxReels), { token }).then(({ websiteReelsTable }) => {
        cy.gql<{ publicWebsiteReels: Array<Row & { is_active: boolean }> }>(PUBLIC_REELS, { site }, { token: null }).then(
          ({ publicWebsiteReels }) => {
            expect(publicWebsiteReels.length, `${site} slider size`).to.be.at.most(maxReels);
            expect(publicWebsiteReels.map((r) => r.id), `${site} serves its first active reels`).to.deep.equal(
              websiteReelsTable.rows.map((r) => r.id),
            );
          },
        );
      });
    });
  });

  it('WR-02 a hidden reel is listed for the admins, never served, and edits keep it hidden', () => {
    const input = { site: 'MAIN', title: title(), description: 'e2e', video_url: VIDEO, sort_order: 1000, is_active: false };
    cy.gql<{ createWebsiteReel: Row & typeof input }>(CREATE, { input }, { token }).then(({ createWebsiteReel: reel }) => {
      expect(reel).to.deep.include(input);
      cy.gql<{ websiteReelsTable: { rows: Row[] } }>(ADMIN_REELS, { query: { search: runAccount().stamp } }, { token }).then(
        ({ websiteReelsTable }) => expect(websiteReelsTable.rows.map((r) => r.id), 'listed in the admin table').to.include(reel.id),
      );
      cy.gql<{ publicWebsiteReels: Row[] }>(PUBLIC_REELS, { site: 'MAIN' }, { token: null }).then(({ publicWebsiteReels }) =>
        expect(publicWebsiteReels.map((r) => r.id), 'a hidden reel is never served').to.not.include(reel.id),
      );
      const edited = { ...input, title: `${title()} edited`, sort_order: 999 };
      cy.gql<{ updateWebsiteReel: typeof input }>(UPDATE, { id: reel.id, input: edited }, { token }).then(({ updateWebsiteReel }) =>
        expect(updateWebsiteReel).to.deep.include(edited),
      );
      cy.gql<{ deleteWebsiteReel: boolean }>(DELETE, { id: reel.id }, { token }).its('deleteWebsiteReel').should('equal', true);
      cy.gql<{ deleteWebsiteReel: boolean }>(DELETE, { id: reel.id }, { token }).its('deleteWebsiteReel').should('equal', false);
    });
  });

  it('WR-03 a malformed reel id is refused before any lookup', () => {
    cy.gqlRaw(DELETE, { id: 'not-an-id' }, { token }).then((body) =>
      expectRefused('deleteWebsiteReel', body, { code: 'BAD_USER_INPUT', message: 'Invalid reel id' }),
    );
    cy.gqlRaw(UPDATE, { id: 'not-an-id', input: { site: 'MAIN', video_url: VIDEO, is_active: false } }, { token }).then((body) =>
      expectRefused('updateWebsiteReel', body, { code: 'BAD_USER_INPUT', message: 'Invalid reel id' }),
    );
  });

  it('WR-04 a site already at its maximum refuses another active reel before saving it', () => {
    SITES.forEach((site) => {
      cy.gql<{ websiteReelsTable: { total: number } }>(ADMIN_REELS, activeOn(site, 1), { token }).then(({ websiteReelsTable }) => {
        if (websiteReelsTable.total < maxReels) return; // room left: an active reel would go live, so it is not sent.
        const input = { site, title: `${title()} over the cap`, video_url: VIDEO, sort_order: 1000, is_active: true };
        cy.gqlRaw(CREATE, { input }, { token }).then((body) =>
          expectRefused('createWebsiteReel', body, {
            code: 'BAD_USER_INPUT',
            message: `This website already shows ${maxReels} reels, the most allowed. Hide or delete one first.`,
          }),
        );
      });
    });
  });
});
