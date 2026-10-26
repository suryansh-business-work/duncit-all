import { ACCESS_DENIED, specMarker } from '../../support/ui-staff';
import {
  adminRaw,
  brandingImage,
  cityAdminSeat,
  expectToast,
  fieldInput,
  releaseAdminRoles,
  signInAdmin,
  typeInto,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Categories (/categories), as a City Admin (category.resolver.ts
 * ADMIN_WRITE = SUPER_ADMIN, CITY_ADMIN).
 *
 * The spec builds its own three-level branch — a super category, a category
 * under it and a sub-category under that, each named with the run's marker —
 * walks it through the column editor, and deletes it (the delete cascades)
 * as its last scenario; `after()` removes whatever a failure left behind.
 * The Home "All" icon and the vibe heading live on the Branding singleton,
 * which only SUPER_ADMIN / TECH_MANAGER write: the vibe heading is proven
 * refused, nothing on Branding is saved.
 */

type Level = 'SUPER' | 'CATEGORY' | 'SUB';

interface CategoryRecord {
  id: string;
  name: string;
  level: Level;
  is_active: boolean;
  media: { url: string; type: 'IMAGE' | 'VIDEO' }[];
  allow_co_hosts: boolean;
  max_co_hosts: number;
  min_pax: number;
  icon_layout_mweb: { position: string } | null;
  icon_layout_native: { position: string } | null;
}

const CATEGORY_LOOKUP = `query E2eAdminCategories($filter: CategoryFilterInput) {
  categories(filter: $filter) {
    id name level is_active media { url type } allow_co_hosts max_co_hosts min_pax
    icon_layout_mweb { position } icon_layout_native { position }
  }
}`;

const DELETE_CATEGORY = `mutation E2eDeleteCategory($id: ID!) { deleteCategory(category_id: $id) }`;

const lookup = (name: string): Cypress.Chainable<CategoryRecord[]> =>
  cy
    .gql<{ categories: CategoryRecord[] }>(CATEGORY_LOOKUP, { filter: { search: name } })
    .then((data) => data.categories.filter((c) => c.name === name));

const one = (name: string): Cypress.Chainable<CategoryRecord> =>
  lookup(name).then((rows) => {
    expect(rows, `exactly one category is named "${name}"`).to.have.length(1);
    return rows[0];
  });

const column = (level: Level) => cy.byTestId(`category-column-${level}`);
const rowIn = (level: Level, name: string) => column(level).contains('[data-testid="category-column-row"]', name);

function openCategories(): void {
  cy.interceptOperation('Categories');
  cy.visitPortal('admin', '/categories');
  cy.wait('@Categories');
}

/** Drill down to `names` (super, then category). */
function drill(...names: string[]): void {
  const levels: Level[] = ['SUPER', 'CATEGORY'];
  names.forEach((name, i) => rowIn(levels[i], name).click());
}

function startCreate(level: Level): void {
  column(level).find('[data-testid="category-column-create"]').click();
  cy.byTestId('category-form-dialog').should('be.visible');
}

function save(): void {
  cy.byTestId('category-form-save').click();
}

describe('Admin · Categories (City Admin, run account)', () => {
  let seat: AdminSeat;
  let marker: string;
  let superName: string;
  let catName: string;
  let subName: string;
  let image: string;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      marker = specMarker(s.account, 'admin-cat');
      superName = `${marker} Super`;
      catName = `${marker} Cat`;
      subName = `${marker} Sub`;
    });
    brandingImage().then((url) => {
      image = url;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    if (!seat) return;
    signInAdmin(seat.account);
    // The super category first: its delete cascades through the branch.
    cy.gql<{ categories: CategoryRecord[] }>(CATEGORY_LOOKUP, { filter: { search: marker } }).then((data) => {
      const order: Level[] = ['SUPER', 'CATEGORY', 'SUB'];
      const rows = data.categories
        .filter((c) => c.name.includes(marker))
        .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
      for (const row of rows) adminRaw(DELETE_CATEGORY, { id: row.id });
    });
    releaseAdminRoles(seat.account);
  });

  it('CAT2-01 creates a super category; a .mp4 media line is stored as VIDEO and the other as IMAGE', () => {
    openCategories();
    startCreate('SUPER');
    cy.byTestId('category-form-status').should('not.exist');
    typeInto('category-form-name', superName);
    fieldInput('category-form-media').type(`${image}\n${image}?e2e=clip.mp4`, { delay: 0 });
    cy.interceptOperation('CreateCategory');
    save();
    cy.wait('@CreateCategory').its('response.body.errors').should('be.undefined');
    expectToast('categories-toast', 'Saved');
    cy.byTestId('category-form-dialog').should('not.exist');
    rowIn('SUPER', superName).should('be.visible');
    one(superName).then((cat) => {
      expect(cat.level).to.eq('SUPER');
      expect(cat.media.map((m) => m.type)).to.deep.eq(['IMAGE', 'VIDEO']);
    });
  });

  it('CAT2-02 a category keeps a separate icon layout for mWeb and for Native', () => {
    openCategories();
    drill(superName);
    startCreate('CATEGORY');
    typeInto('category-form-name', catName);
    cy.byTestId('category-icon-surface-MWEB').click();
    cy.byTestId('category-icon-position-LEFT').click();
    cy.byTestId('category-icon-surface-NATIVE').click();
    cy.byTestId('category-icon-position-RIGHT').click();
    save();
    expectToast('categories-toast', 'Saved');
    one(catName).then((cat) => {
      expect(cat.icon_layout_mweb?.position).to.eq('LEFT');
      expect(cat.icon_layout_native?.position).to.eq('RIGHT');
    });
    rowIn('CATEGORY', catName).find('[data-testid="category-column-edit"]').click();
    cy.byTestId('category-icon-surface-MWEB').click();
    cy.byTestId('category-icon-position-LEFT').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('category-icon-surface-NATIVE').click();
    cy.byTestId('category-icon-position-RIGHT').should('have.attr', 'aria-pressed', 'true');
  });

  it('CAT2-03 a sub-category stores its minimum pax and up to three co-hosts', () => {
    openCategories();
    drill(superName, catName);
    startCreate('SUB');
    typeInto('category-form-name', subName);
    typeInto('category-form-min-pax', '4');
    cy.byTestId('category-form-max-co-hosts').should('not.exist');
    cy.byTestId('category-form-allow-co-hosts').check();
    cy.byTestId('category-form-max-co-hosts').find('[role="combobox"]').click();
    cy.byTestId('category-form-max-co-hosts-3').click();
    save();
    expectToast('categories-toast', 'Saved');
    one(subName).then((sub) => {
      expect(sub.level).to.eq('SUB');
      expect(sub.allow_co_hosts).to.eq(true);
      expect(sub.max_co_hosts).to.eq(3);
      expect(sub.min_pax).to.eq(4);
    });
  });

  it('CAT2-04 a sibling with the same name is refused and the dialog stays open', () => {
    openCategories();
    drill(superName, catName);
    startCreate('SUB');
    typeInto('category-form-name', subName);
    save();
    cy.byTestId('category-form-error').should('have.text', 'A sibling with that name already exists');
    cy.byTestId('category-form-dialog').should('be.visible');
    lookup(subName).should('have.length', 1);
  });

  it('CAT2-05 status is offered only when editing; deactivating shows the "inactive" chip', () => {
    openCategories();
    drill(superName, catName);
    rowIn('SUB', subName).find('[data-testid="category-column-edit"]').click();
    cy.byTestId('category-form-status').find('[role="combobox"]').click();
    cy.byTestId('category-form-status-inactive').click();
    save();
    expectToast('categories-toast', 'Saved');
    rowIn('SUB', subName).should('contain.text', 'inactive');
    one(subName).its('is_active').should('eq', false);
  });

  it('CAT2-06 Challenge Tools are offered on a sub-category only, never on the levels above', () => {
    openCategories();
    drill(superName);
    rowIn('CATEGORY', catName).find('[data-testid="category-column-edit"]').click();
    cy.byTestId('category-form-dialog').should('be.visible');
    cy.byTestId('category-challenge-tools').should('not.exist');
    cy.get('body').type('{esc}');
    rowIn('CATEGORY', catName).click();
    startCreate('SUB');
    cy.byTestId('category-challenge-tools').should(
      'contain.text',
      'Save this sub-category first, then edit it to choose its challenge tools.',
    );
    cy.get('body').type('{esc}');
    rowIn('SUB', subName).find('[data-testid="category-column-edit"]').click();
    cy.byTestId('category-challenge-tools').should(
      'contain.text',
      'Switch challenges on, then choose the scoring tools hosts can use for pods in this sub-category.',
    );
  });

  it('CAT2-07 the vibe section heading is refused to a City Admin (Branding is SUPER_ADMIN / TECH_MANAGER)', () => {
    openCategories();
    typeInto('vibe-heading-field', `${marker} heading`);
    cy.interceptOperation('UpdateBranding');
    cy.byTestId('vibe-heading-save').click();
    cy.wait('@UpdateBranding').its('response.body.errors.0.message').should('eq', ACCESS_DENIED);
    cy.byTestId('vibe-heading-error').should('have.text', ACCESS_DENIED);
  });

  it('CAT2-08 deleting the super category removes its branch and resets the columns', () => {
    openCategories();
    drill(superName, catName);
    rowIn('SUPER', superName).find('[data-testid="category-column-delete"]').click();
    cy.byTestId('category-delete-confirm').click();
    expectToast('categories-toast', 'Deleted');
    column('SUPER').should('not.contain.text', superName);
    column('CATEGORY').should('contain.text', 'Select a super category on the left.');
    column('SUB').should('contain.text', 'Select a category on the left.');
    for (const name of [superName, catName, subName]) lookup(name).should('have.length', 0);
  });
});
