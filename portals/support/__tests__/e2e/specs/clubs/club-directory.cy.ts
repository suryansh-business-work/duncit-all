import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import {
  ACCESS_DENIED,
  PORTAL_REFUSED,
  apiLoginRaw,
  countOperation,
  expectConfirm,
  expectDeniedBanner,
  expectNotSent,
  expectRefused,
  expectTableEmpty,
  expectUiLoginRefused,
  restoreStaffRoles,
  revokeRoles,
  specMarker,
  staffAccount,
  wideViewport,
} from '../../support/ui-staff';
import {
  ZERO_ID,
  consoleLogin,
  expectTiles,
  grantConsoleRoles,
  openTile,
  pickTab,
  rawAs,
  tableQuery,
} from '../../support/ui-directories';

/**
 * Clubs console › Club directory: the brief, /clubs, a club's record and the
 * hosts / pods it opens, as ALL_CLUBS_ACCESS sees them.
 *
 * Every club write (create, edit, delete, hide) is SUPER_ADMIN / CITY_ADMIN on
 * the server (server/src/modules/clubs/club/club.resolver.ts:10 ADMIN_WRITE), so
 * the console role is refused all of them — this spec never writes: the Delete
 * confirmation is cancelled, and the refusal is asked on an id nobody has.
 */

const TABLE = 'admin-clubs';
const LIST = 'ClubsTable';
const DETAIL = 'AdminClubDetail';
const COUNTS = 'ClubDirectoryCounts';
const ROLES = ['ALL_CLUBS_ACCESS'] as const;

const TILES = [
  { key: 'total', label: 'Total', search: '' },
  { key: 'active', label: 'Active', search: '?is_active=true' },
  { key: 'verified', label: 'Verified', search: '?is_verified=true' },
  { key: 'inactive', label: 'Inactive', search: '?is_active=false' },
];

const DELETE_CLUB = `mutation E2eDeleteClub($id: ID!) { deleteClub(club_doc_id: $id) }`;
const CLUB_POD = `query E2eClubPod($query: TableQueryInput) { podsTable(query: $query) { rows { id club_id } } }`;

interface ClubRow {
  id: string;
  club_name: string;
  admin_user_ids?: string[] | null;
  is_hidden?: boolean | null;
}

function openClubs(): Cypress.Chainable<ClubRow[]> {
  wideViewport();
  cy.interceptOperation(LIST);
  cy.visitPortal('clubs', '/clubs');
  return cy.wait(`@${LIST}`).then(({ response }) => {
    const rows = (response?.body.data.clubsTable.rows ?? []) as ClubRow[];
    expect(rows, 'staging lists at least one club').to.have.length.greaterThan(0);
    return rows;
  });
}

/** One of the listed (visible) clubs that runs at least one pod. */
const clubWithPods = (clubs: readonly ClubRow[]) =>
  cy
    .gql<{ podsTable: { rows: { id: string; club_id: string }[] } }>(CLUB_POD, {
      query: {
        page: 1,
        page_size: 1,
        filters: [{ field: 'club_id', op: 'in', values: clubs.filter((c) => !c.is_hidden).map((c) => c.id) }],
      },
    })
    .then(({ podsTable }) => {
      expect(podsTable.rows, 'a club on the first page of the list runs a pod').to.have.length.greaterThan(0);
      return podsTable.rows[0].club_id;
    });

describe('Clubs console · Club directory (run account, password CHANGED)', () => {
  let account: RunAccount;
  let token = '';

  before(() => {
    account = staffAccount();
    grantConsoleRoles(account, ROLES);
  });

  beforeEach(() => {
    consoleLogin('clubs', account).then((t) => {
      token = t;
    });
  });

  after(() => {
    if (account) restoreStaffRoles(account, ROLES);
  });

  it('CD-01 the brief reads is_active and is_verified (clubs have no status), and each tile opens /clubs with its flag', () => {
    cy.interceptOperation(COUNTS);
    cy.visitPortal('clubs', '/');
    cy.byTestId('page-header-title').should('have.text', 'Clubs');
    expectTiles(COUNTS, TILES);
    for (const tile of TILES) openTile('clubs', tile.key, '/clubs', tile.search);
  });

  it('CD-02 the list opened from Inactive asks the server for inactive clubs only', () => {
    cy.visitPortal('clubs', '/');
    cy.interceptOperation(LIST);
    cy.byTestId('directory-tile-inactive').click();
    cy.wait(`@${LIST}`).then((interception) => {
      expect(tableQuery(interception).filters).to.deep.include({ field: 'is_active', op: 'is_false', value: null, values: null });
    });
  });

  it('CD-03 a club with no admin is flagged on its name, the others are not; a search matching nothing shows the empty text', () => {
    openClubs().then((rows) => {
      for (const club of rows) {
        const orphaned = (club.admin_user_ids?.length ?? 0) === 0;
        cy.byTestId(`${TABLE}-row-${club.id}`).should('contain.text', club.club_name);
        cy.byTestId(`club-no-admin-${club.id}`).should(orphaned ? 'exist' : 'not.exist');
      }
    });
    searchTable(LIST, `${specMarker(account, 'clubs')} no club is called this`);
    expectTableEmpty('No clubs yet. Click "New Club" to create the first one.');
  });

  it('CD-04 a row opens the club, its pods icon opens the Pods tab, Edit opens the editor, and an old ?edit= bookmark redirects', () => {
    openClubs().then((rows) => {
      const club = rows[0];
      cy.byTestId(`${TABLE}-row-${club.id}`).click(24, 16);
      cy.location('pathname').should('eq', `/clubs/${club.id}`);
      cy.byTestId('club-details-title').should('have.text', club.club_name);

      openClubs();
      cy.byTestId(`club-view-pods-${club.id}`).click();
      cy.location('pathname').should('eq', `/clubs/${club.id}`);
      cy.location('search').should('eq', '?selectedtab=pods');
      cy.byTestId('club-tab-pods').should('have.attr', 'aria-selected', 'true');

      openClubs();
      cy.byTestId(`${TABLE}-row-${club.id}`).find('[data-testid="row-action-edit"]').click();
      cy.location('pathname').should('eq', `/clubs/${club.id}/edit`);

      cy.visitPortal('clubs', `/clubs?edit=${club.id}`);
      cy.location('pathname').should('eq', `/clubs/${club.id}/edit`);
    });
  });

  it('CD-05 Delete asks "Delete club" and Cancel keeps the club; the server refuses deleteClub to the console role', () => {
    openClubs().then((rows) => {
      const club = rows[0];
      const deletes = countOperation('DeleteClub');
      cy.byTestId(`${TABLE}-row-${club.id}`).find('[data-testid="row-action-delete"]').click();
      expectConfirm('Delete club');
      cy.byTestId('confirm-dialog-message').should('have.text', `Delete club "${club.club_name}"?`);
      cy.byTestId('confirm-dialog-cancel').click();
      cy.byTestId('confirm-dialog').should('not.exist');
      cy.byTestId(`${TABLE}-row-${club.id}`).should('exist');
      expectNotSent(deletes, 'DeleteClub');
    });
    rawAs('clubs', DELETE_CLUB, { id: ZERO_ID }, token).then((body) => expectRefused(body, 'deleteClub', ACCESS_DENIED));
  });

  it('CD-06 the overview shows the club with its Club Admins card, and Edit club opens its editor', () => {
    openClubs().then((rows) => {
      const club = rows[0];
      cy.interceptOperation(DETAIL);
      cy.visitPortal('clubs', `/clubs/${club.id}`);
      cy.wait(`@${DETAIL}`).its('response.body.errors').should('be.undefined');
      cy.byTestId('club-tab-overview').should('have.attr', 'aria-selected', 'true');
      cy.byTestId('club-details-title').should('have.text', club.club_name);
      cy.byTestId('club-admins-card').should('be.visible');
      cy.byTestId('club-details-edit').click();
      cy.location('pathname').should('eq', `/clubs/${club.id}/edit`);
      cy.byTestId('club-editor-heading').should('have.text', 'Edit Club');
      cy.byTestId('club-editor-back').click();
      cy.location('pathname').should('eq', '/clubs');
    });
  });

  it('CD-07 a club admin’s name opens their record inside the club, and Back returns to the overview', () => {
    openClubs().then((rows) => {
      const club = rows.find((row) => (row.admin_user_ids?.length ?? 0) > 0);
      expect(club, 'staging has a club with an admin').to.exist;
      if (!club) return;
      cy.visitPortal('clubs', `/clubs/${club.id}`);
      cy.byTestIdPrefix('club-admin-link-').first().click();
      cy.location('pathname').should('match', new RegExp(`^/clubs/${club.id}/club-admins/[0-9a-f]{24}$`));
      cy.byTestId('back-header-back').click();
      cy.location('pathname').should('eq', `/clubs/${club.id}`);
      cy.location('search').should('eq', '?selectedtab=overview');
    });
  });

  it('CD-08 the Hosts tab lists the club’s hosts, and a host opens inside the club with Back to the Hosts tab', () => {
    openClubs().then((rows) => {
      cy.visitPortal('clubs', `/clubs/${rows[0].id}`);
      cy.interceptOperation('HostsConsoleTable');
      pickTab('club', 'hosts');
      cy.wait('@HostsConsoleTable').then(({ response }) => {
        expect(response?.body.errors, 'hostsTable answers the clubs console').to.be.undefined;
        const [host] = response?.body.data.hostsTable.rows ?? [];
        expect(host, 'the club has a host').to.exist;
        cy.byTestId(`clubs-console-hosts-row-${host.id}`).click(24, 16);
        cy.location('pathname').should('eq', `/clubs/${rows[0].id}/hosts/${host.id}`);
        cy.byTestId('back-header-back').click();
        cy.location('search').should('eq', '?selectedtab=hosts');
      });
    });
  });

  it('CD-09 a pod opens from the club’s Pods tab at /pods/<id>, and Back returns to that club’s Pods tab', () => {
    openClubs().then((clubs) => clubWithPods(clubs)).then((clubId) => {
      cy.interceptOperation('ConsoleRecordPodsTable');
      cy.visitPortal('clubs', `/clubs/${clubId}?selectedtab=pods`);
      cy.wait('@ConsoleRecordPodsTable').then(({ response, request }) => {
        expect(response?.body.errors).to.be.undefined;
        expect(tableQuery({ request }).filters).to.deep.include({ field: 'club_id', op: 'eq', value: clubId, values: null });
        const [pod] = response?.body.data.podsTable.rows ?? [];
        expect(pod, 'the club lists a pod').to.exist;
        cy.byTestId(`clubs-console-pods-row-${pod.id}`).click(24, 16);
        cy.location('pathname').should('eq', `/pods/${pod.id}`);
        cy.byTestId('pod-details-title').should('be.visible');
        cy.byTestId('back-button').should('contain.text', 'Back to club').click();
        cy.location('pathname').should('eq', `/clubs/${clubId}`);
        cy.location('search').should('eq', '?selectedtab=pods');
      });
    });
  });

  it('CD-10 an unknown club reads "Club not found." on its record and in its editor', () => {
    cy.visitPortal('clubs', `/clubs/${ZERO_ID}`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Club not found.');
    cy.visitPortal('clubs', `/clubs/${ZERO_ID}/edit`);
    cy.byTestId('query-guard-not-found').should('have.text', 'Club not found.');
  });

  it('CD-11 without ALL_CLUBS_ACCESS the clubs console refuses the sign-in', () => {
    revokeRoles(account, ROLES);
    expectUiLoginRefused('clubs', account);
    apiLoginRaw('clubs', account).then((body) => expectRefused(body, 'login', PORTAL_REFUSED));
    expectDeniedBanner('clubs', 'Duncit Clubs');
    grantConsoleRoles(account, ROLES);
  });
});
