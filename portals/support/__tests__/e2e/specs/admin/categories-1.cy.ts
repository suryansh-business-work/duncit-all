import { adminRun, releaseAdmin, signInAdmin, type AdminRun } from '../../support/ui-admin-1';

/**
 * Admin › Categories (/categories), first half: drilling into the three-column
 * category tree (CategoriesColumns → ColumnPanel, one `Categories` query per
 * column, filtered by level and parent). Read-only: every panel is compared
 * with the same query asked of the server. Signed in as a City Admin.
 */

interface Cat {
  id: string;
  name: string;
}

type Level = 'SUPER' | 'CATEGORY' | 'SUB';

const CATEGORIES = `query E2eAdminCategories($filter: CategoryFilterInput) { categories(filter: $filter) { id name } }`;

const children = (level: Level, parentId: string | null): Cypress.Chainable<Cat[]> =>
  cy.gql<{ categories: Cat[] }>(CATEGORIES, { filter: { level, parent_id: parentId } }).its('categories');

const panel = (level: Level) => cy.byTestId(`category-column-${level}`);

/** A panel lists exactly these items, or its empty line when there are none. */
function expectPanel(level: Level, items: readonly Cat[]): void {
  if (items.length === 0) {
    panel(level).should('contain.text', 'No items yet. Click + to create one.');
    return;
  }
  panel(level).find('[data-testid="category-column-row"]').should('have.length', items.length);
  for (const item of items) panel(level).should('contain.text', item.name);
}

describe('Admin · Categories — the category tree (City Admin)', () => {
  let run: AdminRun;

  before(() => {
    adminRun(['CITY_ADMIN']).then((r) => {
      run = r;
    });
  });

  beforeEach(() => {
    signInAdmin(run);
  });

  after(() => releaseAdmin(run));

  it('CAT1-01 the tree opens on the super categories; the other two columns ask for a parent first', () => {
    children('SUPER', null).then((supers) => {
      expect(supers, 'staging has super categories').to.have.length.greaterThan(0);
      cy.interceptOperation('Categories');
      cy.visitPortal('admin', '/categories');
      cy.wait('@Categories').its('request.body.variables.filter').should('deep.equal', { level: 'SUPER', parent_id: null });
      expectPanel('SUPER', supers);
      panel('CATEGORY').should('contain.text', 'Select a super category on the left.');
      panel('SUB').should('contain.text', 'Select a category on the left.');
      panel('CATEGORY').find('[data-testid="category-column-create"]').should('be.disabled');
      panel('SUB').find('[data-testid="category-column-create"]').should('be.disabled');
    });
  });

  it('CAT1-02 choosing a super category lists its categories; choosing a category lists its sub-categories', () => {
    children('SUPER', null).then((supers) => {
      const parent = supers[0];
      cy.visitPortal('admin', '/categories');
      panel('SUPER').find('[data-testid="category-column-row"]').contains(parent.name).click();
      panel('SUPER').find('[data-testid="category-column-row"][aria-current="true"]').should('contain.text', parent.name);
      panel('CATEGORY').should('contain.text', `in ${parent.name}`);
      panel('CATEGORY').find('[data-testid="category-column-create"]').should('be.enabled');
      children('CATEGORY', parent.id).then((cats) => {
        expectPanel('CATEGORY', cats);
        if (cats.length === 0) return;
        const category = cats[0];
        panel('CATEGORY').find('[data-testid="category-column-row"]').contains(category.name).click();
        panel('SUB').should('contain.text', `in ${category.name}`);
        children('SUB', category.id).then((subs) => expectPanel('SUB', subs));
      });
    });
  });
});
