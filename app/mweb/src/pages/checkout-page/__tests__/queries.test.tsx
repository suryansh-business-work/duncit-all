import { describe, it, expect } from 'vitest';
import type { DefinitionNode, OperationDefinitionNode } from 'graphql';
import {
  PUBLIC_FINANCE,
  CHECKOUT_ME,
  UPDATE_MY_PROFILE,
  CHECKOUT_POD,
  DUMMY_CHECKOUT,
  PREVIEW_COUPON,
  AVAILABLE_COUPONS,
  CREATE_RAZORPAY_ORDER,
  VERIFY_RAZORPAY_PAYMENT,
  type AvailableCoupon,
  type CouponPreview,
  type CheckoutState,
  type CheckoutContact,
  type CheckoutForm,
} from '../queries';

function op(doc: { definitions: readonly DefinitionNode[] }): OperationDefinitionNode {
  const def = doc.definitions[0];
  expect(def.kind).toBe('OperationDefinition');
  return def as OperationDefinitionNode;
}

describe('checkout-page queries documents', () => {
  it('PUBLIC_FINANCE is a query exposing finance settings fields', () => {
    const def = op(PUBLIC_FINANCE);
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PublicFinanceSettings');
    const printed = JSON.stringify(PUBLIC_FINANCE);
    expect(printed).toContain('publicFinanceSettings');
    expect(printed).toContain('platform_fee_pct');
    expect(printed).toContain('gst_pct');
    expect(printed).toContain('currency_symbol');
    expect(printed).toContain('razorpay_enabled');
  });

  it('CHECKOUT_ME is a query returning user + nested address', () => {
    const def = op(CHECKOUT_ME);
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CheckoutMe');
    const printed = JSON.stringify(CHECKOUT_ME);
    expect(printed).toContain('me');
    expect(printed).toContain('phone_extension');
    expect(printed).toContain('pincode');
  });

  it('UPDATE_MY_PROFILE is a mutation taking UpdateMyProfileInput', () => {
    const def = op(UPDATE_MY_PROFILE);
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CheckoutUpdateMyProfile');
    const varTypes = (def.variableDefinitions ?? []).map(
      (v) => JSON.stringify(v.type),
    );
    expect(varTypes.join()).toContain('UpdateMyProfileInput');
    expect(JSON.stringify(UPDATE_MY_PROFILE)).toContain('updateMyProfile');
  });

  it('CHECKOUT_POD is a query taking an ID and returning product requests', () => {
    const def = op(CHECKOUT_POD);
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CheckoutPod');
    const printed = JSON.stringify(CHECKOUT_POD);
    expect(printed).toContain('pod_doc_id');
    expect(printed).toContain('product_requests');
    expect(printed).toContain('place_charges');
    expect(printed).toContain('pod_images_and_videos');
  });

  it('DUMMY_CHECKOUT is a mutation returning an invoice payload', () => {
    const def = op(DUMMY_CHECKOUT);
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DummyCheckout');
    const printed = JSON.stringify(DUMMY_CHECKOUT);
    expect(printed).toContain('dummyCheckout');
    expect(printed).toContain('invoice_no');
    expect(printed).toContain('paid_at');
  });

  it('PREVIEW_COUPON is a query returning discount preview fields', () => {
    const def = op(PREVIEW_COUPON);
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PreviewCoupon');
    const printed = JSON.stringify(PREVIEW_COUPON);
    expect(printed).toContain('previewCoupon');
    expect(printed).toContain('discount_amount');
    expect(printed).toContain('final_total');
  });

  it('AVAILABLE_COUPONS is a query taking an optional pod_id', () => {
    const def = op(AVAILABLE_COUPONS);
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('AvailableCoupons');
    const printed = JSON.stringify(AVAILABLE_COUPONS);
    expect(printed).toContain('availableCouponsForPod');
    expect(printed).toContain('min_order_amount');
    expect(printed).toContain('scope');
  });

  it('CREATE_RAZORPAY_ORDER is a mutation returning the order + nested payment', () => {
    const def = op(CREATE_RAZORPAY_ORDER);
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateRazorpayOrder');
    const printed = JSON.stringify(CREATE_RAZORPAY_ORDER);
    expect(printed).toContain('createRazorpayOrder');
    expect(printed).toContain('key_id');
    expect(printed).toContain('order_id');
    expect(printed).toContain('prefill_contact');
    expect(printed).toContain('payment');
  });

  it('VERIFY_RAZORPAY_PAYMENT is a mutation returning the payment', () => {
    const def = op(VERIFY_RAZORPAY_PAYMENT);
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('VerifyRazorpayPayment');
    const printed = JSON.stringify(VERIFY_RAZORPAY_PAYMENT);
    expect(printed).toContain('verifyRazorpayPayment');
    expect(printed).toContain('payment_id');
  });

  it('every exported document has exactly one operation definition', () => {
    const docs = [
      PUBLIC_FINANCE,
      CHECKOUT_ME,
      UPDATE_MY_PROFILE,
      CHECKOUT_POD,
      DUMMY_CHECKOUT,
      PREVIEW_COUPON,
      AVAILABLE_COUPONS,
      CREATE_RAZORPAY_ORDER,
      VERIFY_RAZORPAY_PAYMENT,
    ];
    docs.forEach((doc) => {
      const defs = doc.definitions.filter(
        (d) => d.kind === 'OperationDefinition',
      );
      expect(defs).toHaveLength(1);
    });
  });
});

describe('checkout-page exported types are usable', () => {
  it('constructs an AvailableCoupon shape', () => {
    const coupon: AvailableCoupon = {
      id: 'c1',
      code: 'SAVE10',
      description: '10% off',
      discount_pct: 10,
      min_order_amount: 100,
      scope: 'GLOBAL',
    };
    expect(coupon.scope).toBe('GLOBAL');
    const podCoupon: AvailableCoupon = { ...coupon, scope: 'POD' };
    expect(podCoupon.scope).toBe('POD');
  });

  it('constructs a CouponPreview shape', () => {
    const preview: CouponPreview = {
      ok: true,
      message: null,
      code: 'SAVE10',
      discount_pct: 10,
      original_total: 1000,
      discount_amount: 100,
      final_total: 900,
      currency_symbol: '₹',
    };
    expect(preview.final_total).toBe(900);
  });

  it('constructs a CheckoutState with selected products', () => {
    const state: CheckoutState = {
      pod_id: 'p1',
      pod_title: 'Chess',
      amount: 500,
      description: 'Weekly',
      selected_products: [
        { product_id: 'x', quantity: 2, variant_id: 'v1', unit_cost: 50 },
      ],
    };
    expect(state.selected_products?.[0].quantity).toBe(2);
  });

  it('constructs CheckoutContact and CheckoutForm shapes', () => {
    const contact: CheckoutContact = {
      fullName: 'A B',
      email: 'a@b.com',
      phoneExtension: '+91',
      phoneNumber: '9999999999',
    };
    expect(contact.fullName).toBe('A B');

    const form: CheckoutForm = {
      full_name: 'A B',
      email: 'a@b.com',
      phone_extension: '+91',
      phone_number: '9999999999',
      same_as_main: true,
      line1: 'L1',
      line2: '',
      landmark: '',
      city: 'City',
      state: 'State',
      pincode: '000000',
      country: 'India',
      billing_email: 'a@b.com',
      has_gstin: false,
      gstin: '',
      save_as_main: true,
      simulate_failure: false,
    };
    expect(form.same_as_main).toBe(true);
  });
});
