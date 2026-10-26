import { IDEA_CATEGORIES } from '../../support/operations';
import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { consoleAccount, releaseConsoleRole, signIn } from '../../support/ui-finance-crm';
import { expectRefused, gqlRaw, specMarker } from '../../support/ui-staff';

/**
 * CRM › Data catalogues › Services offered (/data/services-offered), as a
 * CRM_MANAGER seat.
 *
 * Services are filed per hierarchy slot (super category / category / sub):
 * adding a title the slot already holds is idempotent — nothing new is created
 * — and renaming a service onto a title the slot holds is refused
 * (serviceOffered.service.ts `createMany` / `applyTitleUpdate`). The services
 * this spec files carry `runMarker(stamp, 'crm-data')` and are deleted in
 * `after()`; no real service is touched.
 */

const TABLE = 'crm-services-offered';
const OPERATION = 'CrmServicesOfferedTable';

const CREATE = `mutation E2eCreateServicesOffered($input: CreateCrmServiceOfferedInput!) {
  createCrmServicesOffered(input: $input) { id title }
}`;

const UPDATE = `mutation E2eUpdateServiceOffered($id: ID!, $input: UpdateCrmServiceOfferedInput!) {
  updateCrmServiceOffered(id: $id, input: $input) { id title }
}`;

const DELETE = `mutation E2eDeleteServiceOffered($id: ID!) { deleteCrmServiceOffered(id: $id) }`;

const LOOKUP = `query E2eServicesOffered($query: TableQueryInput) {
  crmServicesOfferedTable(query: $query) { rows { id title } }
}`;

interface Service {
  id: string;
  title: string;
}

describe('CRM · Data catalogues (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let superId = '';

  before(() => {
    account = consoleAccount('crm');
    marker = specMarker(account, 'crm-data');
    signIn('crm', account);
    cy.gql<{ supers: { id: string; name: string }[] }>(IDEA_CATEGORIES).then(({ supers }) => {
      expect(supers, 'staging has a super category to file services under').to.have.length.greaterThan(0);
      superId = supers[0]?.id ?? '';
    });
  });

  beforeEach(() => {
    signIn('crm', account);
  });

  after(() => {
    if (marker) {
      signIn('crm', account);
      cy.gql<{ crmServicesOfferedTable: { rows: Service[] } }>(LOOKUP, { query: { search: marker, page: 1, page_size: 50 } }).then(
        ({ crmServicesOfferedTable }) => {
          for (const row of crmServicesOfferedTable.rows.filter((r) => r.title.includes(marker))) cy.gql(DELETE, { id: row.id });
        },
      );
    }
    releaseConsoleRole(account, 'crm');
  });

  it('CDC-01 services filed under a super category are listed, and re-adding a title creates nothing', () => {
    const first = `${marker} Catering`;
    const second = `${marker} Decor`;
    cy.gql<{ createCrmServicesOffered: Service[] }>(CREATE, {
      input: { super_category_id: superId, applies_to_venue: true, titles: [first, second] },
    }).then(({ createCrmServicesOffered: created }) => {
      expect(created.map((s) => s.title), 'both titles are filed').to.have.members([first, second]);
      cy.gql<{ createCrmServicesOffered: Service[] }>(CREATE, {
        input: { super_category_id: superId, applies_to_venue: true, titles: [first] },
      })
        .its('createCrmServicesOffered')
        .should('have.length', 0);

      cy.interceptOperation(OPERATION);
      cy.visitPortal('crm', '/data/services-offered');
      cy.wait(`@${OPERATION}`);
      searchTable(OPERATION, marker);
      for (const service of created) cy.byTestId(`${TABLE}-row-${service.id}`).first().should('contain.text', service.title);
    });
  });

  it('CDC-02 renaming a service onto a title its category already holds is refused', () => {
    const keep = `${marker} Lighting`;
    const rename = `${marker} Sound`;
    cy.gql<{ createCrmServicesOffered: Service[] }>(CREATE, {
      input: { super_category_id: superId, applies_to_venue: true, titles: [keep, rename] },
    }).then(({ createCrmServicesOffered: created }) => {
      const toRename = created.find((s) => s.title === rename);
      expect(toRename, 'the second service was filed').to.exist;
      cy.apiPortalLogin('crm', account.email, account.password('CHANGED')).then((token) =>
        gqlRaw('crm', UPDATE, { id: toRename?.id, input: { title: keep } }, token).then((body) =>
          expectRefused(body, 'updateCrmServiceOffered', 'A service with that title already exists in this category'),
        ),
      );
    });
  });
});
