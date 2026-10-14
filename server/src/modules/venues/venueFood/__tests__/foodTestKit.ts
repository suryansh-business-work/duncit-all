import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The pricing matrix `@duncit/utils` asserts `priceFoodCart` against, read
 * from the package's own fixture — so the price a guest is shown and the price
 * the server charges are held to the SAME numbers, not to two copies of them.
 */
export interface PricingCase {
  name: string;
  lines: Array<{ unit_price: number; quantity: number }>;
  discount_pct: number;
  /** 0 for a case without a coupon. */
  coupon_pct: number;
  /** The GST the case is priced with; INCLUSIVE at 0 is no tax at all. */
  tax_mode: 'INCLUSIVE' | 'EXCLUSIVE';
  gst_pct: number;
  subtotal_paise: number;
  discount_paise: number;
  coupon_discount_paise: number;
  taxable_paise: number;
  tax_paise: number;
  total_paise: number;
  below_minimum: boolean;
}

const FIXTURE = path.resolve(__dirname, '../../../../../..', 'packages/utils/__tests__/fixtures/venue-food-pricing.json');

export const PRICING_CASES = (JSON.parse(readFileSync(FIXTURE, 'utf8')) as { cases: PricingCase[] }).cases;
