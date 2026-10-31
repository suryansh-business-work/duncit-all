/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused } from '../../../support/api-partners';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';
import { storeProduct, storeSettings, type StoreCard } from '../../../support/ui-websites';

/**
 * Autoship on the pet store (ecomm.duncit.com /autoship) for a signed-in
 * shopper: subscribe, pause/resume, skip, order now and cancel
 * (commerce/store/store.autoship.service.ts). Only the REMIND mode is used —
 * it never books an order by itself (COD_AUTO would), its first reminder is a
 * whole cycle away, and the plan is cancelled before the scenario ends. "Order
 * now" only puts the delivery in the run account's cart (no order is placed);
 * the cart is emptied again. With Autoship switched off in the store's
 * settings the subscribe call itself is refused, and that is what is asserted.
 * The file name sorts after store-shopper-isolation.cy.ts on purpose: that
 * spec's SS-01 proves a member who never shopped has no plans, which stops
 * being true once this one has run. Scenario map: Ecomm Store › Autoship.
 */

const SETTINGS = `query E2eAsSettings { storeSettings { autoship_enabled autoship_frequencies } }`;
const SUB_FIELDS = 'id product_id qty frequency_weeks mode status next_run_at';
const CREATE = `mutation E2eAsCreate($input: StoreSubscriptionInput!) { storeCreateSubscription(input: $input) { ${SUB_FIELDS} } }`;
const PAUSE = `mutation E2eAsPause($id: ID!, $paused: Boolean!) { storePauseSubscription(id: $id, paused: $paused) { ${SUB_FIELDS} } }`;
const SKIP = `mutation E2eAsSkip($id: ID!) { storeSkipSubscription(id: $id) { ${SUB_FIELDS} } }`;
const ORDER_NOW = `mutation E2eAsOrderNow($id: ID!) { storeSubscriptionOrderNow(id: $id) { lines { product_id quantity } } }`;
const CANCEL = `mutation E2eAsCancel($id: ID!) { storeCancelSubscription(id: $id) { ${SUB_FIELDS} } }`;
const MINE = `query E2eAsMine { storeMySubscriptions { id status } }`;
const CLEAR = `mutation E2eAsClear { storeClearCart { item_count } }`;

const WEEK_MS = 7 * 86_400_000;
const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });
const CANCELLED = bad('This subscription has been cancelled');
const NOT_ACTIVE = bad('Only an active subscription can skip a delivery');

interface Sub {
  id: string;
  product_id: string;
  qty: number;
  frequency_weeks: number;
  mode: string;
  status: string;
  next_run_at: string | null;
}

describe('API · Pet store Autoship: a reminder plan the shopper pauses, skips, orders and cancels', { testIsolation: false }, () => {
  let memberToken = '';
  let product: StoreCard;
  let enabled = false;
  let weeks = 0;
  let sub: Sub | null = null;

  const input = (change: Record<string, unknown> = {}) => ({
    input: {
      product_id: product.id,
      variant_id: product.has_variants ? product.lead_variant_id : null,
      qty: 1,
      frequency_weeks: weeks,
      mode: 'REMIND',
      contact: { name: 'E2E Shopper', email: runAccount().email, phone_extension: '+91', phone_number: '9876501234' },
      shipping_address: { name: 'E2E Shopper', phone: '9876501234', line1: '12 Residency Road, Ashok Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560025' },
      ...change,
    },
  });
  const call = (query: string, variables: Record<string, unknown>, field: string) =>
    cy.gql<Record<string, Sub>>(query, variables, { token: memberToken }).then((d) => d[field]);

  before(() => {
    storeSettings();
    signInRunMember().then((token) => {
      memberToken = token;
    });
    storeProduct(() => true, 'to subscribe to').then((card) => {
      product = card;
    });
    cy.gql<{ storeSettings: { autoship_enabled: boolean; autoship_frequencies: number[] } }>(SETTINGS, {}, { token: null }).then(
      ({ storeSettings: s }) => {
        enabled = s.autoship_enabled;
        weeks = s.autoship_frequencies[0] ?? 2;
      },
    );
  });

  after(() => {
    cy.gql(CLEAR, {}, { token: memberToken });
    if (sub) cy.gqlRaw(CANCEL, { id: sub.id }, { token: memberToken });
  });

  it('AS-01 subscribing needs a sign-in, and is refused outright while Autoship is switched off', () => {
    expectEachRefused('storeCreateSubscription', CREATE, input(), [[null, SIGNED_OUT]]);
    if (!enabled) {
      expectEachRefused('storeCreateSubscription', CREATE, input(), [[memberToken, bad('Autoship is not available right now')]]);
    }
  });

  it('AS-02 a rhythm the store does not offer, a zero quantity, a bad contact or an unlisted product is refused', function () {
    if (!enabled) this.skip();
    [
      [{ frequency_weeks: 99 }, bad('Choose how often it should arrive')],
      [{ contact: { name: 'E2E', email: 'not-an-email', phone_extension: '+91', phone_number: '9876501234' } }, bad('Enter a valid email address')],
      [{ product_id: NO_ID, variant_id: null }, bad('This product is not available for Autoship')],
      [{ qty: 0 }, bad('Choose a valid quantity')],
    ].forEach(([change, refusal]) => {
      cy.gqlRaw(CREATE, input(change as Record<string, unknown>), { token: memberToken }).then((body) =>
        expectRefused('storeCreateSubscription', body, refusal as Refusal),
      );
    });
  });

  it('AS-03 "Start Autoship" makes an active reminder plan due one cycle from now', function () {
    if (!enabled) this.skip();
    const started = Date.now();
    call(CREATE, input(), 'storeCreateSubscription').then((created) => {
      sub = created;
      expect(created).to.deep.include({ product_id: product.id, qty: 1, frequency_weeks: weeks, mode: 'REMIND', status: 'ACTIVE' });
      const due = Date.parse(String(created.next_run_at));
      expect(due - started, 'next delivery').to.be.within(weeks * WEEK_MS - 300_000, weeks * WEEK_MS + 300_000);
    });
    cy.gql<{ storeMySubscriptions: Array<{ id: string; status: string }> }>(MINE, {}, { token: memberToken })
      .its('storeMySubscriptions')
      .then((list) => expect(list.map((s) => s.id)).to.include(sub?.id));
  });

  it('AS-04 a paused plan cannot skip; resumed, "Skip next" moves the delivery one cycle on', function () {
    if (!enabled || !sub) this.skip();
    const id = sub?.id;
    call(PAUSE, { id, paused: true }, 'storePauseSubscription').its('status').should('equal', 'PAUSED');
    cy.gqlRaw(SKIP, { id }, { token: memberToken }).then((body) => expectRefused('storeSkipSubscription', body, NOT_ACTIVE));
    call(PAUSE, { id, paused: false }, 'storePauseSubscription').then((resumed) => {
      expect(resumed.status).to.equal('ACTIVE');
      call(SKIP, { id }, 'storeSkipSubscription').then((skipped) => {
        const moved = Date.parse(String(skipped.next_run_at)) - Date.parse(String(resumed.next_run_at));
        expect(moved, 'pushed back by the rhythm').to.equal(weeks * WEEK_MS);
      });
    });
  });

  it('AS-05 "Order now" puts the delivery in the cart without placing an order', function () {
    if (!enabled || !sub) this.skip();
    cy.gql(CLEAR, {}, { token: memberToken });
    cy.gql<{ storeSubscriptionOrderNow: { lines: Array<{ product_id: string; quantity: number }> } }>(ORDER_NOW, { id: sub?.id }, { token: memberToken })
      .its('storeSubscriptionOrderNow.lines')
      .then((lines: Array<{ product_id: string; quantity: number }>) => {
        expect(lines.find((l) => l.product_id === product.id)?.quantity, 'the plan’s quantity').to.equal(1);
      });
    cy.gql(CLEAR, {}, { token: memberToken });
  });

  it('AS-06 a cancelled plan has no next delivery and cannot be skipped, ordered or resumed', function () {
    if (!enabled || !sub) this.skip();
    const id = sub?.id;
    call(CANCEL, { id }, 'storeCancelSubscription').then((cancelled) => {
      expect(cancelled.status).to.equal('CANCELLED');
      expect(cancelled.next_run_at).to.be.null;
    });
    cy.gqlRaw(SKIP, { id }, { token: memberToken }).then((body) => expectRefused('storeSkipSubscription', body, NOT_ACTIVE));
    cy.gqlRaw(ORDER_NOW, { id }, { token: memberToken }).then((body) => expectRefused('storeSubscriptionOrderNow', body, CANCELLED));
    cy.gqlRaw(PAUSE, { id, paused: false }, { token: memberToken }).then((body) => expectRefused('storePauseSubscription', body, CANCELLED));
    cy.gql<{ storeMySubscriptions: Array<{ id: string; status: string }> }>(MINE, {}, { token: memberToken })
      .its('storeMySubscriptions')
      .then((list) => expect(list.find((s) => s.id === id)?.status).to.equal('CANCELLED'));
  });
});
