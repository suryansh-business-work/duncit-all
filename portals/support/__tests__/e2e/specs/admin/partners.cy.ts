import { openRow, openTable, searchTable, tableRow } from '../../support/tables';
import { adminRun, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';
import { expectTableEmpty, specMarker } from '../../support/ui-staff';

/**
 * Admin › Partners (/partners): every user holding a partner role, in the
 * `admin-partners` table over `partnersTable`; a row opens the shared user
 * details page. Signed in as a Support Agent, whom the directory does not hold
 * to a city, so the list is the platform's. Read-only: the partner the spec
 * follows is the newest one staging has.
 */

const TABLE = 'admin-partners';
const PARTNERS = 'PartnersTable';

/** PartnersPage PARTNER_TYPES. */
const PARTNER_TYPES: Readonly<Record<string, string>> = {
  HOST: 'Host',
  VENUE_OWNER: 'Venue Partner',
  ECOMM_MANAGER: 'Product Seller',
  CLUB_ADMIN: 'Club Admin',
};

interface Partner {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
}

const NEWEST_PARTNER = `query E2eAdminNewestPartner($query: TableQueryInput) {
  partnersTable(query: $query) { total rows { user_id full_name email roles } }
}`;

describe('Admin · Partners (Support Agent)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['SUPPORT_USER']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  /** The newest partner with an email to search by. */
  const newestPartner = (): Cypress.Chainable<Partner> =>
    cy
      .gql<{ partnersTable: { rows: Partner[] } }>(NEWEST_PARTNER, {
        query: { page: 1, page_size: 25, sort_by: 'created_at', sort_dir: 'desc' },
      })
      .then(({ partnersTable }) => {
        const partner = partnersTable.rows.find((p) => p.email);
        if (!partner) throw new Error('Staging has no partner with an email: the Partners scenarios need one.');
        return partner;
      });

  it('PRT-01 the list opens newest first; searching a partner’s email narrows to them with their partner types', () => {
    newestPartner().then((partner) => {
      openTable('admin', '/partners', PARTNERS);
      cy.get(`@${PARTNERS}`).its('request.body.variables.query').should('include', { sort_by: 'created_at', sort_dir: 'desc' });
      searchTable(PARTNERS, String(partner.email));
      const types = partner.roles.filter((r) => PARTNER_TYPES[r]).map((r) => PARTNER_TYPES[r]);
      expect(types, 'a partner holds at least one partner role').to.have.length.greaterThan(0);
      tableRow(TABLE, partner.user_id, [String(partner.email), ...types]);
      cy.byTestIdPrefix(`${TABLE}-row-`).each(($row) => expect($row.text()).to.contain(String(partner.email)));
    });
  });

  it('PRT-02 a partner row opens the shared user details page for that partner', () => {
    newestPartner().then((partner) => {
      openTable('admin', '/partners', PARTNERS);
      searchTable(PARTNERS, String(partner.email));
      cy.interceptOperation('AdminUser');
      openRow(TABLE, partner.user_id, [String(partner.email)]);
      cy.location('pathname').should('eq', `/users/${partner.user_id}`);
      cy.wait('@AdminUser').its('response.body.data.user.user_id').should('eq', partner.user_id);
      cy.byTestId('back-header-title').should('have.text', partner.full_name || partner.email);
    });
  });

  it('PRT-03 a search no partner matches reads "No partners yet."', () => {
    openTable('admin', '/partners', PARTNERS);
    searchTable(PARTNERS, specMarker(run.account, 'admin-partners-none'));
    expectTableEmpty('No partners yet.');
  });
});
