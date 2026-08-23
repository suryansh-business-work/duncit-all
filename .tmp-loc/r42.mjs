import { apply } from "./e.mjs";
apply("packages/coupons/src/coupon/coupon.form.cy.ts", [
  [
    "import { couponFormSchema, couponFormDefaults, toCouponInput } from './coupon.form';",
    "import { buildCouponFormSchema, couponFormDefaults, toCouponInput } from './coupon.form';\n\n// The schema takes the console's translator; outside React the key is the copy.\nconst couponFormSchema = buildCouponFormSchema((key) => key);",
  ],
]);
