import { apply } from "./e.mjs";
apply("packages/coupons/docs/index.mdx", [
  ["  - 'couponFormSchema'", "  - 'buildCouponFormSchema'"],
  [
    "`couponFormSchema` is the Zod contract behind the dialog (React Hook Form +",
    "`buildCouponFormSchema(t)` is the Zod contract behind the dialog (React Hook Form +",
  ],
]);
apply("packages/docs-demos/src/demos/coupons.tsx", [
  [
    "import { couponFormDefaults, couponFormSchema, toCouponInput } from '@duncit/coupons';",
    "import { buildCouponFormSchema, couponFormDefaults, toCouponInput } from '@duncit/coupons';",
  ],
  [
    "      const parsed = couponFormSchema.safeParse(mock);",
    "      // The messages come from the catalogue, so the schema takes a\n      // translator — the live one inside a console, the key itself here.\n      const parsed = buildCouponFormSchema((key) => key).safeParse(mock);",
  ],
]);
