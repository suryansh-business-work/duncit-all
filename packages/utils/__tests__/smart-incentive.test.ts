import { describe, expect, it } from 'vitest';
import { ticketDiscountFor } from '../src/pod-ticket-discount';
import {
  DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
  DEFAULT_SMART_INCENTIVE_MAX_PCT,
  smartIncentiveFor,
  smartIncentiveFormValues,
  smartIncentiveInput,
  smartIncentivePctIssue,
} from '../src/smart-incentive';

describe('smartIncentiveFor', () => {
  it('takes the offer off the ticket money and says what is left', () => {
    expect(smartIncentiveFor(1000, 10)).toEqual({ pct: 10, amount: 100, net: 900 });
  });

  it('rounds the discount to the paisa and keeps amount + net equal to the ticket money', () => {
    const quote = smartIncentiveFor(333.33, 7);
    expect(quote).toEqual({ pct: 7, amount: 23.33, net: 310 });
    expect(quote.amount + quote.net).toBeCloseTo(333.33, 2);
  });

  it('compounds with the multi-ticket discount instead of adding to it', () => {
    // 3 tickets of ₹500 with a 20% tier: ₹1200 of ticket money, then 10% off that.
    const tier = ticketDiscountFor(500, 3, {
      ticket_discount_enabled: true,
      ticket_discount_tiers: [{ min_tickets: 3, discount_pct: 20 }],
    });
    const quote = smartIncentiveFor(tier.net, 10);
    expect(quote).toEqual({ pct: 10, amount: 120, net: 1080 });
    // 30% added would have left ₹1050 — the compounded bill is ₹30 more.
    expect(quote.net).toBeGreaterThan(1500 * 0.7);
  });

  it.each([
    ['no offer', null],
    ['an undefined offer', undefined],
    ['a zero offer', 0],
    ['a negative offer', -10],
    ['a fractional offer', 12.5],
    ['a non-number offer', Number.NaN],
  ])('takes nothing off for %s', (_label, pct) => {
    expect(smartIncentiveFor(800, pct)).toEqual({ pct: 0, amount: 0, net: 800 });
  });

  it('takes nothing off a free or negative ticket and never reports negative money', () => {
    expect(smartIncentiveFor(0, 15)).toEqual({ pct: 0, amount: 0, net: 0 });
    expect(smartIncentiveFor(-50, 15)).toEqual({ pct: 0, amount: 0, net: 0 });
    expect(smartIncentiveFor(Number.NaN, 15)).toEqual({ pct: 0, amount: 0, net: 0 });
  });
});

describe('smartIncentivePctIssue', () => {
  it('accepts every whole percentage from 1 up to and including the maximum', () => {
    expect(smartIncentivePctIssue('1', 20)).toBeNull();
    expect(smartIncentivePctIssue('20', 20)).toBeNull();
    expect(smartIncentivePctIssue(' 12 ', 20)).toBeNull();
    expect(smartIncentivePctIssue(15, 20)).toBeNull();
  });

  it.each([[''], ['   '], [null], [undefined]])('asks for a value when it is %j', (value) => {
    expect(smartIncentivePctIssue(value, 20)).toBe('REQUIRED');
  });

  it.each([['0'], ['-5'], ['7.5'], ['ten'], ['1e1x']])('refuses %j as below a whole 1%', (value) => {
    expect(smartIncentivePctIssue(value, 20)).toBe('PCT_MIN');
  });

  it('refuses anything above the maximum Loyalty allows', () => {
    expect(smartIncentivePctIssue('21', 20)).toBe('PCT_MAX');
    expect(smartIncentivePctIssue('90', 50)).toBe('PCT_MAX');
  });
});

describe('smartIncentiveInput', () => {
  it('sends the typed percentage as a number when switched on for a paid pod', () => {
    expect(smartIncentiveInput({ smart_incentive_enabled: true, smart_incentive_pct: '15' }, false)).toEqual({
      smart_incentive_enabled: true,
      smart_incentive_pct: 15,
    });
  });

  it('sends it off at 0% when switched off, whatever was typed', () => {
    expect(smartIncentiveInput({ smart_incentive_enabled: false, smart_incentive_pct: '15' }, false)).toEqual({
      smart_incentive_enabled: false,
      smart_incentive_pct: 0,
    });
  });

  it('sends it off at 0% for a free pod even when the switch is on', () => {
    expect(smartIncentiveInput({ smart_incentive_enabled: true, smart_incentive_pct: '15' }, true)).toEqual({
      smart_incentive_enabled: false,
      smart_incentive_pct: 0,
    });
  });
});

describe('smartIncentiveFormValues', () => {
  it('reads a pod that offers the incentive as switched on with its percentage', () => {
    expect(smartIncentiveFormValues({ smart_incentive_enabled: true, smart_incentive_pct: 12 })).toEqual({
      smart_incentive_enabled: true,
      smart_incentive_pct: '12',
    });
  });

  it.each([
    ['switched off', { smart_incentive_enabled: false, smart_incentive_pct: 12 }],
    ['switched on at 0%', { smart_incentive_enabled: true, smart_incentive_pct: 0 }],
    ['a pod from before the incentive existed', {}],
    ['null fields', { smart_incentive_enabled: null, smart_incentive_pct: null }],
  ])('reads %s as off with an empty percentage', (_label, pod) => {
    expect(smartIncentiveFormValues(pod)).toEqual({ smart_incentive_enabled: false, smart_incentive_pct: '' });
  });
});

describe('defaults', () => {
  it('match the server twin until Loyalty saves its own settings', () => {
    expect(DEFAULT_SMART_INCENTIVE_MAX_PCT).toBe(20);
    expect(DEFAULT_SMART_INCENTIVE_DELAY_SECONDS).toBe(15);
  });
});
