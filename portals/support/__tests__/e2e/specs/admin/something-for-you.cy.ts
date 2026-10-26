import { countOperation, expectConfirm, expectNotSent, specMarker } from '../../support/ui-staff';
import {
  adminRaw,
  cityAdminSeat,
  fieldInput,
  releaseAdminRoles,
  signInAdmin,
  typeInto,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Engagement › Something for you (/something-for-you): the rail at
 * the bottom of Home, as a City Admin (somethingForYou.resolver.ts
 * WRITE_ROLES = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, WEBSITE_MANAGER).
 *
 * The rail is shared and live on mWeb and the app, so every card this spec
 * adds is created with "Show on Home" OFF (it carries the Hidden chip and no
 * member ever sees it), named with the run's marker, and deleted — by the last
 * scenario, or by `after()`.
 */

interface CardRecord {
  id: string;
  title: string;
  action_type: string;
  link_path: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

const ITEMS = `query E2eSomethingForYou { somethingForYouItems { id title action_type link_path link_url sort_order is_active } }`;
const DELETE_ITEM = `mutation E2eDeleteSomethingForYou($id: ID!) { deleteSomethingForYouItem(itemId: $id) }`;
const TITLE_MAX = 30;

const items = () => cy.gql<{ somethingForYouItems: CardRecord[] }>(ITEMS).its('somethingForYouItems');
const itemNamed = (title: string): Cypress.Chainable<CardRecord | undefined> =>
  items().then((rows: CardRecord[]) => cy.wrap<CardRecord | undefined>(rows.find((r) => r.title === title), { log: false }));
const card = (title: string) => cy.contains('[data-testid="sfy-card"]', title);

function openRail(): void {
  cy.interceptOperation('SomethingForYouItems');
  cy.visitPortal('admin', '/something-for-you');
  cy.wait('@SomethingForYouItems');
}

/** New card with a title, kept off Home. */
function startHiddenCard(title: string): void {
  cy.byTestId('sfy-new').click();
  typeInto('sfy-form-title', title);
  cy.byTestId('sfy-form-active').should('be.checked').uncheck();
}

describe('Admin · Something For You (City Admin, run account)', () => {
  let seat: AdminSeat;
  let marker: string;
  let routeCard: string;
  let linkCard: string;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
      // `[E2E <stamp> sfy]` plus two letters: well inside the 30-character title.
      marker = specMarker(s.account, 'sfy');
      routeCard = `${marker} R`;
      linkCard = `${marker} U`;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    if (!seat) return;
    signInAdmin(seat.account);
    items().then((rows: CardRecord[]) => {
      for (const row of rows.filter((r) => r.title.includes(marker))) adminRaw(DELETE_ITEM, { id: row.id });
    });
    releaseAdminRoles(seat.account);
  });

  it('SFY-01 the page lists every Home rail card in sort order, or says the section is hidden when there are none', () => {
    items().then((rows: CardRecord[]) => {
      openRail();
      if (rows.length === 0) {
        cy.byTestId('sfy-empty').should('have.text', 'No cards yet, so the section is hidden on Home.');
        return;
      }
      cy.byTestId('sfy-empty').should('not.exist');
      cy.byTestId('sfy-card').should('have.length', rows.length);
      cy.byTestId('sfy-card-action').each(($line, i) => {
        expect($line.text(), `card ${i + 1} reads its order`).to.contain(`order ${rows[i].sort_order}`);
      });
    });
  });

  it('SFY-02 a card that opens an in-app screen is found by its path and reads "opens /referral"', () => {
    openRail();
    startHiddenCard(routeCard);
    cy.byTestId('sfy-form-cta-ROUTE').click();
    fieldInput('sfy-form-route').type('/referral', { delay: 0 }).type('{downArrow}{enter}');
    fieldInput('sfy-form-route').should('have.value', 'Refer and earn');
    cy.interceptOperation('CreateSomethingForYouItem');
    cy.byTestId('sfy-form-save').click();
    cy.wait('@CreateSomethingForYouItem').its('response.body.errors').should('be.undefined');
    card(routeCard).within(() => {
      cy.byTestId('sfy-card-action').should('contain.text', 'opens /referral');
      cy.byTestId('sfy-card-hidden').should('have.text', 'Hidden');
    });
    itemNamed(routeCard).then((row) => {
      expect(row?.action_type).to.eq('ROUTE');
      expect(row?.link_path).to.eq('/referral');
      expect(row?.is_active).to.eq(false);
    });
  });

  it('SFY-03 a web-link card reads "opens <address>"', () => {
    openRail();
    startHiddenCard(linkCard);
    cy.byTestId('sfy-form-cta-URL').click();
    typeInto('sfy-form-url', 'https://duncit.com/blog');
    cy.byTestId('sfy-form-save').click();
    card(linkCard).find('[data-testid="sfy-card-action"]').should('contain.text', 'opens https://duncit.com/blog');
    itemNamed(linkCard).its('action_type').should('eq', 'URL');
  });

  it(`SFY-04 Save stays off without a title, and the title stops at ${TITLE_MAX} characters`, () => {
    openRail();
    const creates = countOperation('CreateSomethingForYouItem');
    cy.byTestId('sfy-new').click();
    cy.byTestId('sfy-form-save').should('be.disabled');
    fieldInput('sfy-form-title').type('x'.repeat(TITLE_MAX + 5), { delay: 0 });
    fieldInput('sfy-form-title').should('have.value', 'x'.repeat(TITLE_MAX));
    cy.byTestId('sfy-form-title').should('contain.text', `${TITLE_MAX}/${TITLE_MAX}`);
    fieldInput('sfy-form-title').clear();
    cy.byTestId('sfy-form-save').should('be.disabled');
    expectNotSent(creates, 'CreateSomethingForYouItem');
  });

  // SFY-SILENT: the server refuses a web-link card with no address
  // (somethingForYou.validator.ts:61), and the editor shows that refusal in the open dialog.
  it('SFY-SILENT a web-link card with no address shows the server refusal and saves nothing', () => {
    openRail();
    startHiddenCard(`${marker} X`);
    cy.byTestId('sfy-form-cta-URL').click();
    cy.interceptOperation('CreateSomethingForYouItem');
    cy.byTestId('sfy-form-save').click();
    cy.wait('@CreateSomethingForYouItem')
      .its('response.body.errors.0.message')
      .should('contain', 'Enter the address this card opens');
    cy.byTestId('sfy-form-error').should('contain.text', 'Enter the address this card opens');
    cy.get('[role="dialog"]').should('contain.text', 'Enter the address this card opens');
    itemNamed(`${marker} X`).should('eq', undefined);
  });

  it('SFY-05 editing a card changes what it opens; deleting it after the confirmation removes the row', () => {
    openRail();
    card(linkCard).find('[data-testid="sfy-card-edit"]').click();
    typeInto('sfy-form-url', 'https://duncit.com/about');
    cy.byTestId('sfy-form-active').should('not.be.checked');
    cy.byTestId('sfy-form-save').click();
    card(linkCard).find('[data-testid="sfy-card-action"]').should('contain.text', 'opens https://duncit.com/about');

    for (const title of [linkCard, routeCard]) {
      card(title).find('[data-testid="sfy-card-delete"]').click();
      expectConfirm('Delete card');
      cy.byTestId('confirm-dialog-message').should('contain.text', title);
      cy.byTestId('confirm-dialog-confirm').click();
      cy.contains('[data-testid="sfy-card"]', title).should('not.exist');
      itemNamed(title).should('eq', undefined);
    }
  });
});
