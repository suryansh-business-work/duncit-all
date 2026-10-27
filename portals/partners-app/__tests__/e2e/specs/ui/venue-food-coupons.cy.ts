/// <reference types="cypress" />
import { FOOD_ORDER_LIMITS } from '@duncit/utils';
import {
  countOperation,
  expectNotSent,
  marked,
  partnerWorld,
  signInRunPartner,
  visitWithVenue,
  type PartnerWorld,
} from '../../support/ui-partners-3';
import { runAccount } from '../../support/run-account';

/**
 * Venue food coupons, live (scenario map › Partners › Venue food coupons), on
 * the run's own food-serving venue.
 *
 * /venues/food-coupons (src/pages/venue-food-coupons-page) mounts
 * @duncit/venue-food's VenueFoodCoupons: the server table
 * (`venueFoodCouponsTable`), the create / edit dialog (FoodCouponDialog, Zod
 * rules from @duncit/forms/schemas food-coupon.ts) and each row's switch and
 * delete. The coupon this spec creates it deletes through the page; `after()`
 * deletes it if a scenario stopped half-way. The venue takes no orders, so no
 * guest can use it meanwhile.
 *
 * The grid is wide (ten columns); the viewport is widened so the switch and
 * the row actions are drawn rather than virtualised off-screen.
 */

const COUPONS = `query E2eUiP3Coupons($id: ID!) { venueFoodCouponsTable(venue_id: $id) { rows { id code } } }`;
const DELETE = `mutation E2eUiP3DeleteCoupon($id: ID!) { deleteVenueFoodCoupon(coupon_id: $id) }`;

const couponsOf = (venueId: string): Cypress.Chainable<Array<{ id: string; code: string }>> =>
  cy
    .gql<{ venueFoodCouponsTable: { rows: Array<{ id: string; code: string }> } }>(COUPONS, { id: venueId })
    .then((data) => data.venueFoodCouponsTable.rows);

/** The coupons page for `venueId`, once the table has its first answer. */
function openCoupons(venueId: string): void {
  cy.viewport(2400, 900);
  cy.interceptOperation('VenueFoodCouponsTable');
  visitWithVenue('/venues/food-coupons', venueId);
  cy.wait('@VenueFoodCouponsTable');
}

/** Fill the dialog's code and discount (and, optionally, the total uses). */
function fillCoupon(code: string, discount: string, maxUses?: string): void {
  cy.byTestId('food-coupon-code').find('input').clear().type(code);
  cy.byTestId('food-coupon-discount').find('input').clear().type(discount);
  if (maxUses !== undefined) cy.byTestId('food-coupon-max-uses').find('input').clear().type(maxUses);
}

describe('Partners · Venue food coupons (the run’s own venue)', () => {
  let world: PartnerWorld;
  /** Upper case on the server; typed in lower case to prove the field upper-cases it. */
  const code = `UI-${runAccount().stamp}`;
  let couponId = '';

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
      if (!found.venue.offersFood) {
        throw new Error('Fixture prerequisite: the run venue does not serve food (fixtures/venue-food.cy.ts VFD-03).');
      }
      couponsOf(found.venue.id).then((rows) => {
        if (rows.some((row) => row.code === code)) throw new Error(`Coupon ${code} already exists on the run venue.`);
      });
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  after(() => {
    if (!world) return;
    signInRunPartner();
    couponsOf(world.venue.id).then((rows) => {
      rows.filter((row) => row.code === code).forEach((row) => cy.gql(DELETE, { id: row.id }));
    });
  });

  it('VFC-01 a coupon is created (its code upper-cased), edited, switched off and deleted, each step confirmed', () => {
    openCoupons(world.venue.id);
    cy.byTestId('food-coupon-new').should('have.text', 'New coupon').click();
    fillCoupon(code.toLowerCase(), '10', '5');
    cy.byTestId('food-coupon-code').find('input').should('have.value', code);
    cy.byTestId('food-coupon-description').find('textarea').first().type(marked('food coupon'));
    cy.interceptOperation('CreateVenueFoodCoupon');
    cy.byTestId('food-coupon-save').click();
    cy.wait('@CreateVenueFoodCoupon').then(({ response }) => {
      const created = response?.body?.data?.createVenueFoodCoupon as { id: string; code: string; is_active: boolean };
      expect(created.code, 'stored code').to.equal(code);
      expect(created.is_active, 'active on creation').to.equal(true);
      couponId = created.id;
    });
    cy.byTestId('notify-success').should('have.text', `Coupon ${code} created`);
    cy.byTestId('food-coupon-form').should('not.exist');

    cy.then(() => {
      cy.byTestId(`food-coupon-edit-${couponId}`).should('have.attr', 'aria-label', `Edit ${code}`).click();
      cy.byTestId('food-coupon-discount').find('input').should('have.value', '10').clear().type('15');
      cy.interceptOperation('UpdateVenueFoodCoupon');
      cy.byTestId('food-coupon-save').click();
      cy.wait('@UpdateVenueFoodCoupon').its('response.body.data.updateVenueFoodCoupon.discount_pct').should('eq', 15);
      cy.byTestId('notify-success').should('have.text', `Coupon ${code} updated`);

      cy.interceptOperation('SetVenueFoodCouponActive');
      cy.byTestId(`food-coupon-active-${couponId}`).find('input').should('be.checked').click();
      cy.wait('@SetVenueFoodCouponActive').its('response.body.data.setVenueFoodCouponActive.is_active').should('eq', false);
      cy.byTestId('notify-success').should('have.text', `Coupon ${code} is off. Guests can no longer use it.`);
      cy.byTestId(`food-coupon-active-${couponId}`).find('input').should('not.be.checked');

      cy.byTestId(`food-coupon-delete-${couponId}`).click();
      cy.byTestId('confirm-dialog-title').should('have.text', `Delete coupon ${code}?`);
      cy.interceptOperation('DeleteVenueFoodCoupon');
      cy.byTestId('confirm-dialog-confirm').click();
      cy.wait('@DeleteVenueFoodCoupon');
      cy.byTestId('notify-success').should('have.text', `Coupon ${code} deleted`);
      cy.byTestId(`food-coupon-edit-${couponId}`).should('not.exist');
      couponsOf(world.venue.id).then((rows) => {
        expect(rows.map((row) => row.code), 'coupons left on the venue').not.to.include(code);
      });
    });
  });

  it('VFC-02 a short code, a discount over the ceiling and a zero use limit are refused on the page', () => {
    openCoupons(world.venue.id);
    const creates = countOperation('CreateVenueFoodCoupon');
    cy.byTestId('food-coupon-new').click();
    fillCoupon('AB', String(FOOD_ORDER_LIMITS.maxDiscountPct + 5));
    cy.byTestId('food-coupon-per-person').find('input').type('0');
    cy.byTestId('food-coupon-save').click();
    cy.byTestId('food-coupon-code').should(
      'contain.text',
      `Use ${FOOD_ORDER_LIMITS.couponCodeMin} to ${FOOD_ORDER_LIMITS.couponCodeMax} characters`,
    );
    cy.byTestId('food-coupon-discount').should('contain.text', `Enter a whole number from 1 to ${FOOD_ORDER_LIMITS.maxDiscountPct}`);
    cy.byTestId('food-coupon-per-person').should('contain.text', 'Enter a whole number of 1 or more, or leave it empty');
    cy.byTestId('food-coupon-form').should('be.visible');
    expectNotSent(creates, 'CreateVenueFoodCoupon');
  });

  it('VFC-03 a code the venue already uses is refused by the server, and the dialog keeps what was typed', () => {
    openCoupons(world.venue.id);
    cy.byTestId('food-coupon-new').click();
    fillCoupon(code, '10');
    cy.interceptOperation('CreateVenueFoodCoupon');
    cy.byTestId('food-coupon-save').click();
    cy.wait('@CreateVenueFoodCoupon').then(({ response }) => {
      couponId = (response?.body?.data?.createVenueFoodCoupon as { id: string }).id;
    });
    cy.byTestId('notify-success').should('have.text', `Coupon ${code} created`);
    cy.byTestId('food-coupon-new').click();
    fillCoupon(code, '12');
    cy.byTestId('food-coupon-save').click();
    cy.wait('@CreateVenueFoodCoupon').its('response.body.errors.0.message').should('eq', 'This venue already has a coupon with this code');
    cy.byTestId('food-coupon-error').should('have.text', 'This venue already has a coupon with this code');
    cy.byTestId('food-coupon-code').find('input').should('have.value', code);
    cy.byTestId('food-coupon-discount').find('input').should('have.value', '12');
    // after() deletes the coupon this scenario created.
  });
});
