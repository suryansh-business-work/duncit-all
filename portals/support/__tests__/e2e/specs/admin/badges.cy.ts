import { expectConfirm, specMarker } from '../../support/ui-staff';
import { adminRaw, cityAdminSeat, releaseAdminRoles, signInAdmin, typeInto, type AdminSeat } from '../../support/ui-admin-2';

/**
 * Admin › Badges (/badges), as a City Admin (badge.resolver.ts ADMIN_WRITE =
 * SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN).
 *
 * The catalogue is shared: the spec reads every card, then creates its own
 * marker-named badges, edits one, and deletes them (`after()` removes any a
 * failure left). Creating a badge awards nothing by itself — badges are
 * evaluated on member activity — and nobody is awarded one by hand here.
 */

interface BadgeRecord {
  id: string;
  title: string;
  condition_type: string;
  threshold: number;
  category_id: string | null;
  role_key: string;
  is_active: boolean;
}

const BADGES = `query E2eAdminBadges { badges { id title condition_type threshold category_id role_key is_active } }`;
const CATEGORY_PICK = `query E2eBadgeCategoryPick { categories { id name level } }`;
const DELETE_BADGE = `mutation E2eDeleteBadge($id: ID!) { deleteBadge(badge_doc_id: $id) }`;

const allBadges = () => cy.gql<{ badges: BadgeRecord[] }>(BADGES).its('badges');
const badgeNamed = (title: string): Cypress.Chainable<BadgeRecord | undefined> =>
  allBadges().then((rows: BadgeRecord[]) => cy.wrap<BadgeRecord | undefined>(rows.find((b) => b.title === title), { log: false }));
const card = (title: string) => cy.contains('[data-testid="badge-card"]', title);

function openBadges(): void {
  cy.interceptOperation('Badges');
  cy.visitPortal('admin', '/badges');
  cy.wait('@Badges');
}

function pickCondition(condition: string): void {
  cy.byTestId('badge-form-condition').find('[role="combobox"]').click();
  cy.byTestId(`badge-form-condition-${condition}`).click();
}

describe('Admin · Badges (City Admin, run account)', () => {
  let seat: AdminSeat;
  let marker: string;
  let countBadge: string;
  let scopedBadge: string;
  let manualBadge: string;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      marker = specMarker(s.account, 'admin-badge');
      countBadge = `${marker} Host`;
      scopedBadge = `${marker} Scoped`;
      manualBadge = `${marker} Manual`;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    if (!seat) return;
    signInAdmin(seat.account);
    allBadges().then((rows: BadgeRecord[]) => {
      for (const b of rows.filter((r) => r.title.includes(marker))) adminRaw(DELETE_BADGE, { id: b.id });
    });
    releaseAdminRoles(seat.account);
  });

  it('BDG-01 every badge in the catalogue is drawn as a card with its condition and Edit / Delete', () => {
    allBadges().then((rows: BadgeRecord[]) => {
      openBadges();
      cy.byTestId('badge-card').should('have.length', rows.length);
      for (const b of rows.slice(0, 5)) {
        card(b.title).within(() => {
          cy.byTestId('badge-card-condition').should('contain.text', `≥ ${b.threshold}`);
          cy.byTestId('badge-card-edit').should('have.attr', 'aria-label', `Edit ${b.title}`);
          cy.byTestId('badge-card-delete').should('have.attr', 'aria-label', `Delete ${b.title}`);
          cy.byTestId('badge-card-inactive').should(b.is_active ? 'not.exist' : 'exist');
        });
      }
    });
  });

  it('BDG-02 creates a count badge: the dialog closes and the card reads "Pods hosted ≥ 10"', () => {
    openBadges();
    cy.byTestId('badges-new').click();
    cy.byTestId('badge-form-condition').find('[role="combobox"]').should('have.text', 'Pods attended');
    typeInto('badge-form-title', countBadge);
    pickCondition('POD_HOST_COUNT');
    typeInto('badge-form-threshold', '10');
    cy.interceptOperation('CreateBadge');
    cy.byTestId('badge-form-save').click();
    cy.wait('@CreateBadge').its('response.body.errors').should('be.undefined');
    cy.byTestId('badge-form-save').should('not.exist');
    card(countBadge).find('[data-testid="badge-card-condition"]').should('have.text', 'Pods hosted ≥ 10');
  });

  it('BDG-03 "Pods attended in a category" asks for the category and stores it; none stores no category', () => {
    cy.gql<{ categories: { id: string; level: string }[] }>(CATEGORY_PICK).then(({ categories }) => {
      const category = categories.find((c) => c.level === 'CATEGORY') ?? categories[0];
      if (!category) throw new Error('Staging has no category to scope a badge to.');
      openBadges();
      cy.byTestId('badges-new').click();
      cy.byTestId('badge-form-category').should('not.exist');
      typeInto('badge-form-title', scopedBadge);
      pickCondition('CATEGORY_POD_ATTEND_COUNT');
      cy.byTestId('badge-form-category').find('[role="combobox"]').click();
      cy.byTestId(`badge-form-category-${category.id}`).click();
      cy.byTestId('badge-form-save').click();
      card(scopedBadge).should('contain.text', 'Pods attended in a category');
      badgeNamed(scopedBadge).its('category_id').should('eq', category.id);

      card(scopedBadge).find('[data-testid="badge-card-edit"]').click();
      cy.byTestId('badge-form-category').find('[role="combobox"]').click();
      cy.byTestId('badge-form-category-none').click();
      cy.byTestId('badge-form-save').click();
      cy.byTestId('badge-form-save').should('not.exist');
      badgeNamed(scopedBadge).its('category_id').should('eq', null);
    });
  });

  it('BDG-04 a partner-role or manual badge has a fixed threshold; Manual asks for no category or role', () => {
    openBadges();
    cy.byTestId('badges-new').click();
    typeInto('badge-form-title', manualBadge);
    pickCondition('ROLE_GRANTED');
    fieldInputDisabled();
    cy.byTestId('badge-form-role').should('exist');
    pickCondition('MANUAL');
    fieldInputDisabled();
    cy.byTestId('badge-form-role').should('not.exist');
    cy.byTestId('badge-form-category').should('not.exist');
    cy.byTestId('badge-form-save').click();
    card(manualBadge).should('contain.text', 'Awarded by an admin');
    badgeNamed(manualBadge).then((b) => {
      expect(b?.condition_type).to.eq('MANUAL');
      expect(b?.category_id ?? null).to.eq(null);
    });
  });

  it('BDG-05 editing a badge to inactive shows the "Inactive" chip on its card', () => {
    openBadges();
    card(countBadge).find('[data-testid="badge-card-edit"]').click();
    cy.byTestId('badge-form-active').should('be.checked').uncheck();
    cy.byTestId('badge-form-save').click();
    cy.byTestId('badge-form-save').should('not.exist');
    card(countBadge).find('[data-testid="badge-card-inactive"]').should('have.text', 'Inactive');
    badgeNamed(countBadge).its('is_active').should('eq', false);
  });

  it('BDG-06 deletes a badge after a destructive confirmation; the card disappears', () => {
    openBadges();
    card(manualBadge).find('[data-testid="badge-card-delete"]').click();
    expectConfirm('Delete badge');
    cy.byTestId('confirm-dialog-confirm').click();
    cy.contains('[data-testid="badge-card"]', manualBadge).should('not.exist');
    badgeNamed(manualBadge).should('eq', undefined);
  });
});

/** The threshold field is greyed out for conditions fixed at one. */
function fieldInputDisabled(): void {
  cy.byTestId('badge-form-threshold').find('input').should('be.disabled');
}
