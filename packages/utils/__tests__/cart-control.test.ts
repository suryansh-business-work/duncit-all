import { describe, expect, it } from 'vitest';

import {
  CART_CONTROL_NOTICE_MS,
  cartControlNotice,
  cartControlState,
  stepCartQuantity,
} from '../src/cart-control';

describe('cartControlState', () => {
  it('shows a lone add while the product is not in the cart', () => {
    expect(cartControlState(0, 5)).toEqual({ mode: 'add', decrease: 'remove', canIncrease: true });
  });

  it('turns the left button into remove while exactly one unit is in', () => {
    expect(cartControlState(1, 5)).toEqual({ mode: 'stepper', decrease: 'remove', canIncrease: true });
  });

  it('makes it a minus from two up', () => {
    expect(cartControlState(2, 5).decrease).toBe('decrease');
    expect(cartControlState(4, 5).decrease).toBe('decrease');
  });

  it('stops the plus at the stock, and above it', () => {
    expect(cartControlState(5, 5).canIncrease).toBe(false);
    expect(cartControlState(7, 5).canIncrease).toBe(false);
    expect(cartControlState(4, 5).canIncrease).toBe(true);
  });

  it('cannot add anything when there is none to sell', () => {
    expect(cartControlState(0, 0)).toEqual({ mode: 'add', decrease: 'remove', canIncrease: false });
  });

  it('reads a broken quantity or stock as nothing', () => {
    expect(cartControlState(Number.NaN, 5).mode).toBe('add');
    expect(cartControlState(-2, 5).mode).toBe('add');
    expect(cartControlState(2.9, 5)).toEqual({ mode: 'stepper', decrease: 'decrease', canIncrease: true });
    expect(cartControlState(1, Number.NaN).canIncrease).toBe(false);
    expect(cartControlState(1, Number.POSITIVE_INFINITY).canIncrease).toBe(false);
  });
});

describe('stepCartQuantity', () => {
  it('moves one unit either way', () => {
    expect(stepCartQuantity(2, 1, 5)).toBe(3);
    expect(stepCartQuantity(2, -1, 5)).toBe(1);
  });

  it('never goes below zero or above the stock', () => {
    expect(stepCartQuantity(0, -1, 5)).toBe(0);
    expect(stepCartQuantity(5, 1, 5)).toBe(5);
  });

  it('pulls a quantity that is already over the stock back down to it', () => {
    expect(stepCartQuantity(9, 1, 5)).toBe(5);
    expect(stepCartQuantity(9, -1, 5)).toBe(5);
  });

  it('adds nothing with no stock', () => {
    expect(stepCartQuantity(0, 1, 0)).toBe(0);
  });
});

describe('cartControlNotice', () => {
  it('says added when the first unit goes in, whatever the size of the step', () => {
    expect(cartControlNotice(0, 1)).toBe('added');
    expect(cartControlNotice(0, 3)).toBe('added');
  });

  it('says removed when the last unit comes out', () => {
    expect(cartControlNotice(1, 0)).toBe('removed');
    expect(cartControlNotice(4, 0)).toBe('removed');
  });

  it('stays quiet for a step between two quantities, and for no change', () => {
    expect(cartControlNotice(1, 2)).toBeNull();
    expect(cartControlNotice(3, 2)).toBeNull();
    expect(cartControlNotice(0, 0)).toBeNull();
    expect(cartControlNotice(2, 2)).toBeNull();
  });

  it('treats a broken quantity as zero on either side', () => {
    expect(cartControlNotice(Number.NaN, 1)).toBe('added');
    expect(cartControlNotice(1, Number.NaN)).toBe('removed');
  });
});

describe('CART_CONTROL_NOTICE_MS', () => {
  it('is short enough not to queue behind the next tap', () => {
    expect(CART_CONTROL_NOTICE_MS).toBeGreaterThanOrEqual(1000);
    expect(CART_CONTROL_NOTICE_MS).toBeLessThanOrEqual(2500);
  });
});
