/**
 * The product cart control's DERIVATION — the one rule every surface agrees on
 * for "what does this product's cart button look like right now" (CLAUDE.md
 * rules 29 + 56).
 *
 * A product that is not in the cart shows a single round "+". Once it is in,
 * the same spot holds a pill: a remove glyph while one unit is there (taking
 * the last one away IS removing it), a minus from two up, the count, and a
 * plus that stops at the stock. Adding the first unit and removing the last
 * each raise a short notice on the card.
 *
 * Only the decisions live here: mWeb and the store draw them with MUI
 * (`@duncit/ui`), the native app with Tamagui, so no icon, colour or copy does.
 */

/** A lone "+" until the product is in the cart, then the quantity pill. */
export type CartControlMode = 'add' | 'stepper';

/** What the pill's left button does: take the last unit away, or one of several. */
export type CartControlDecrease = 'remove' | 'decrease';

export interface CartControlState {
  mode: CartControlMode;
  decrease: CartControlDecrease;
  /** False at the stock — or with none to sell, where even the "+" is off. */
  canIncrease: boolean;
}

/** The copy a surface hands the control, already translated and named. */
export interface CartControlLabels {
  /** The round "+": "Add Masala Chai". */
  add: string;
  /** The pill's plus: "Add one more Masala Chai". */
  increase: string;
  /** The pill's minus from two up: "Remove one Masala Chai". */
  decrease: string;
  /** The pill's left button at one: "Remove Masala Chai". */
  remove: string;
  /** The count's accessible name: "Masala Chai quantity". */
  quantity: string;
  /** The notice after the first unit goes in: "Item added". */
  added: string;
  /** The notice after the last unit comes out: "Item removed". */
  removed: string;
}

export type CartControlNotice = 'added' | 'removed';

/** How long a notice stays on the card. Long enough to read two words, short enough not to queue. */
export const CART_CONTROL_NOTICE_MS = 1600;

/** A whole, non-negative count: a stray NaN or fraction from storage never reaches the screen. */
function wholeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** What the control shows for a quantity against the most that can be bought. */
export function cartControlState(quantity: number, max: number): CartControlState {
  const count = wholeCount(quantity);
  return {
    mode: count > 0 ? 'stepper' : 'add',
    decrease: count > 1 ? 'decrease' : 'remove',
    canIncrease: count < wholeCount(max),
  };
}

/** One step up or down, held inside `0..max`. */
export function stepCartQuantity(quantity: number, delta: 1 | -1, max: number): number {
  return Math.min(wholeCount(max), Math.max(0, wholeCount(quantity) + delta));
}

/**
 * The notice a quantity change earns, if any. Only the two changes that move
 * the product in or out of the cart: a step between two and three says so with
 * the number itself.
 */
export function cartControlNotice(previous: number, next: number): CartControlNotice | null {
  const before = wholeCount(previous);
  const after = wholeCount(next);
  if (before === 0 && after > 0) return 'added';
  if (before > 0 && after === 0) return 'removed';
  return null;
}
