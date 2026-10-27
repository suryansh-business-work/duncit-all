/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { expectAnswer, marked, refusal } from '../../../support/api-apps';
import { ensureVenue, signInRunPartner, type FixtureVenue } from '../../../support/fixture-world';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue food, run by the owner of the run's own venue — with no Razorpay
 * account, so ordering never opens and no money can move. Scenario map: Apps ›
 * Venue food ordering ("Ordering closed or venue Razorpay account missing"),
 * Venue food coupons, Venue food desk; Partners › Venue food menu.
 *
 * venue.food.ts buildVenueFoodPatch checks every dish (a name, a price inside
 * the configured range), the discount, and that ordering is only switched on
 * for a venue that lists an available dish and has linked its OWN checked
 * Razorpay account. venueFoodOrder.service.ts place / previewCoupon refuse a
 * venue that is not taking orders before anything is priced or written;
 * venueFoodCoupon.service.ts checks each coupon term and keeps one code per
 * venue. Everything this spec adds it deletes or switches off again.
 */

const CONFIG = `query E2eFixtureFoodConfig { venueRegistrationConfig { food_price_max food_discount_max_pct } }`;
const SAVE = `mutation E2eFixtureFoodSave($id: ID!, $input: UpdateApprovedVenueInput!) {
  updateApprovedVenue(venue_id: $id, input: $input) {
    offers_food
    food_menu { id name price is_available }
    food_ordering { enabled razorpay_linked discount_pct }
  }
}`;
const PUBLIC_MENU = `query E2eFixtureFoodPublic($id: ID!) { publicVenue(venue_id: $id) { offers_food food_menu { id } } }`;
const PLACE = `mutation E2eFixtureFoodPlace($input: PlaceVenueFoodOrderInput!) { placeVenueFoodOrder(input: $input) { access_key } }`;
const PREVIEW = `query E2eFixtureFoodPreview($input: PreviewVenueFoodCouponInput!) { previewVenueFoodCoupon(input: $input) { ok } }`;
const OFFERS = `query E2eFixtureFoodOffers($id: ID!) { availableVenueFoodCoupons(venue_id: $id) { code } }`;
const ORDERS = `query E2eFixtureFoodOrders($id: ID!) { venueFoodOrdersTable(venue_id: $id) { total } }`;
const STATS = `query E2eFixtureFoodStats($id: ID!) { venueFoodStats(venue_id: $id, days: 30) { orders revenue served cancelled } }`;
const COUPON_FIELDS = 'code description discount_pct max_uses is_active used_count';
const CREATE_COUPON = `mutation E2eFixtureCouponCreate($input: CreateVenueFoodCouponInput!) {
  createVenueFoodCoupon(input: $input) { id ${COUPON_FIELDS} }
}`;
const UPDATE_COUPON = `mutation E2eFixtureCouponUpdate($id: ID!, $input: UpdateVenueFoodCouponInput!) {
  updateVenueFoodCoupon(coupon_id: $id, input: $input) { ${COUPON_FIELDS} }
}`;
const ACTIVE_COUPON = `mutation E2eFixtureCouponActive($id: ID!, $on: Boolean!) {
  setVenueFoodCouponActive(coupon_id: $id, is_active: $on) { is_active }
}`;
const DELETE_COUPON = `mutation E2eFixtureCouponDelete($id: ID!) { deleteVenueFoodCoupon(coupon_id: $id) }`;
const COUPONS = `query E2eFixtureCoupons($id: ID!) { venueFoodCouponsTable(venue_id: $id) { total rows { code } } }`;

const bad = (message: string) => refusal('BAD_USER_INPUT', message);
const CLOSED = refusal('FOOD_ORDERING_CLOSED', 'This venue is not taking food orders right now');

const dish = (name: string, extra: Record<string, unknown> = {}) => ({ name, price: 120, ...extra });

describe('API · Venue food: the owner’s menu, coupons and closed ordering', { testIsolation: false }, () => {
  let token = '';
  let venue: FixtureVenue;
  let limits = { food_price_max: 0, food_discount_max_pct: 0 };
  let dishId = '';
  let couponId = '';
  const code = `E2E-${runAccount().stamp}`;

  const save = (input: Record<string, unknown>) => cy.gqlRaw(SAVE, { id: venue.id, input }, { token });

  before(() => {
    signInRunPartner().then((partner) => {
      token = partner;
      ensureVenue(partner).then((found) => {
        venue = found;
      });
      cy.gql(CONFIG, {}, { token: partner }).then(({ venueRegistrationConfig }) => {
        limits = venueRegistrationConfig;
      });
    });
  });

  it('VFD-01 a dish without a name, a price outside the range, or a discount over the ceiling is refused', () => {
    const name = marked('dish');
    save({ offers_food: true, food_menu: [dish('')] }).then((body) =>
      expectRefused('updateApprovedVenue', body, bad('Every menu item needs a name')),
    );
    save({ offers_food: true, food_menu: [dish(name, { price: 0 })] }).then((body) =>
      expectRefused('updateApprovedVenue', body, bad(`Enter a price between 1 and ${limits.food_price_max} for "${name}"`)),
    );
    const discount = limits.food_discount_max_pct + 1;
    save({ food_ordering: { discount_pct: discount } }).then((body) =>
      expectRefused(
        'updateApprovedVenue',
        body,
        bad(`The discount must be a whole number from 0 to ${limits.food_discount_max_pct}`),
      ),
    );
  });

  it('VFD-02 ordering stays off without an available dish or the owner’s own Razorpay account', () => {
    const off = dish(marked('dish off'), { is_available: false });
    save({ offers_food: true, food_menu: [off], food_ordering: { enabled: true } }).then((body) =>
      expectRefused('updateApprovedVenue', body, bad('Add at least one available menu item before taking food orders')),
    );
    save({ offers_food: true, food_menu: [dish(marked('dish'))], food_ordering: { enabled: true } }).then((body) =>
      expectRefused('updateApprovedVenue', body, bad('Connect a Razorpay account before taking food orders')),
    );
    save({ food_ordering: { razorpay_integration_id: 'not-an-account' } }).then((body) =>
      expectRefused('updateApprovedVenue', body, bad('Choose a valid Razorpay account')),
    );
    save({ food_ordering: { razorpay_integration_id: NO_ID } }).then((body) =>
      expectRefused('updateApprovedVenue', body, bad('That Razorpay account does not belong to the owner of this venue')),
    );
  });

  it('VFD-03 the owner saves a menu with ordering off, and the public page shows it', () => {
    const on = marked('dish');
    const off = marked('dish off');
    const menu = [dish(on), dish(off, { is_available: false })];
    type Saved = {
      offers_food: boolean;
      food_menu: Array<{ id: string; name: string; price: number; is_available: boolean }>;
      food_ordering: unknown;
    };
    cy.gql<{ updateApprovedVenue: Saved }>(
      SAVE,
      { id: venue.id, input: { offers_food: true, food_menu: menu, food_ordering: { enabled: false } } },
      { token },
    ).then(({ updateApprovedVenue: saved }) => {
      expect(saved.offers_food, 'offers_food').to.equal(true);
      const rows = saved.food_menu.map(({ name, price, is_available }) => ({ name, price, is_available }));
      expect(rows, 'menu').to.deep.equal([
        { name: on, price: 120, is_available: true },
        { name: off, price: 120, is_available: false },
      ]);
      const ordering = { enabled: false, razorpay_linked: false, discount_pct: 0 };
      expect(saved.food_ordering, 'food_ordering').to.deep.equal(ordering);
      dishId = saved.food_menu[0].id;
    });
    cy.then(() =>
      cy.gql(PUBLIC_MENU, { id: venue.id }, { token: null }).then(({ publicVenue }) => {
        expect(publicVenue.offers_food, 'public offers_food').to.equal(true);
        expect(publicVenue.food_menu.map((row: { id: string }) => row.id), 'public menu').to.include(dishId);
      }),
    );
  });

  it('VFD-04 a guest cannot order or price a coupon while ordering is off, and nothing is written', () => {
    const items = [{ item_id: dishId, quantity: 1 }];
    const input = {
      venue_id: venue.id,
      items,
      customer_name: 'E2E Guest',
      customer_phone: runAccount().phone.slice(-10),
      client_key: `e2e-${runAccount().stamp}-food-closed-attempt`,
    };
    cy.gqlRaw(PLACE, { input }, { token: null }).then((body) => expectRefused('placeVenueFoodOrder', body, CLOSED));
    cy.gqlRaw(PREVIEW, { input: { venue_id: venue.id, coupon_code: code, items } }, { token: null }).then((body) =>
      expectRefused('previewVenueFoodCoupon', body, CLOSED),
    );
    cy.gqlRaw(OFFERS, { id: venue.id }, { token: null }).then((body) => expectAnswer('availableVenueFoodCoupons', body, []));
    cy.gqlRaw(ORDERS, { id: venue.id }, { token }).then((body) => expectAnswer('venueFoodOrdersTable', body, { total: 0 }));
    cy.gqlRaw(STATS, { id: venue.id }, { token }).then((body) =>
      expectAnswer('venueFoodStats', body, { orders: 0, revenue: 0, served: 0, cancelled: 0 }),
    );
  });

  it('VFD-05 a coupon with a bad code, discount, window or use limit is refused', () => {
    const coupon = (extra: Record<string, unknown>) => ({ venue_id: venue.id, code, discount_pct: 10, ...extra });
    const create = (input: Record<string, unknown>) => cy.gqlRaw(CREATE_COUPON, { input }, { token });
    create(coupon({ code: 'ab' })).then((body) =>
      expectRefused('createVenueFoodCoupon', body, bad('Code must be 3-30 chars: A-Z, 0-9, - or _')),
    );
    create(coupon({ discount_pct: 0 })).then((body) =>
      expectRefused(
        'createVenueFoodCoupon',
        body,
        bad(`The discount must be a whole number from 1 to ${limits.food_discount_max_pct}`),
      ),
    );
    const from = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    create(coupon({ valid_from: from, valid_until: from })).then((body) =>
      expectRefused('createVenueFoodCoupon', body, bad('The end date must be after the start date')),
    );
    create(coupon({ max_uses: 0 })).then((body) =>
      expectRefused('createVenueFoodCoupon', body, bad('Total uses must be a whole number of 1 or more')),
    );
  });

  it('VFD-06 the owner adds a coupon once, edits it, switches it off and deletes it', () => {
    const input = { venue_id: venue.id, code: code.toLowerCase(), discount_pct: 10, max_uses: 5 };
    cy.gqlRaw(CREATE_COUPON, { input }, { token }).then((body) => {
      expect(body.errors, 'createVenueFoodCoupon errors').to.be.undefined;
      const created = body.data?.createVenueFoodCoupon as { id: string; code: string };
      expect(created.code, 'stored upper case').to.equal(code);
      couponId = created.id;
    });
    cy.gqlRaw(CREATE_COUPON, { input }, { token }).then((body) =>
      expectRefused('createVenueFoodCoupon', body, bad('This venue already has a coupon with this code')),
    );
    cy.then(() => {
      const description = marked('coupon');
      cy.gqlRaw(UPDATE_COUPON, { id: couponId, input: { description, discount_pct: 15 } }, { token }).then((body) =>
        expectAnswer('updateVenueFoodCoupon', body, {
          code,
          description,
          discount_pct: 15,
          max_uses: 5,
          is_active: true,
          used_count: 0,
        }),
      );
      cy.gqlRaw(ACTIVE_COUPON, { id: couponId, on: false }, { token }).then((body) =>
        expectAnswer('setVenueFoodCouponActive', body, { is_active: false }),
      );
      cy.gqlRaw(COUPONS, { id: venue.id }, { token }).then((body) =>
        expectAnswer('venueFoodCouponsTable', body, { total: 1, rows: [{ code }] }),
      );
      cy.gqlRaw(DELETE_COUPON, { id: couponId }, { token }).then((body) => expectAnswer('deleteVenueFoodCoupon', body, true));
      cy.gqlRaw(COUPONS, { id: venue.id }, { token }).then((body) =>
        expectAnswer('venueFoodCouponsTable', body, { total: 0, rows: [] }),
      );
    });
  });
});
