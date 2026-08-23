import { apply } from "./e.mjs";

apply("packages/docs-demos/src/demos/ad-request-form.tsx", [
  [
    "import {\n  AD_DURATION_FALLBACK,\n  adRequestSchema,\n  blankAdRequestValues,\n  makeAdRequestSchema,\n  toSubmitAdRequestInput,\n} from '@duncit/ad-request-form';",
    "import {\n  AD_DURATION_FALLBACK,\n  adRequestT,\n  buildAdRequestSchema,\n  blankAdRequestValues,\n  makeAdRequestSchema,\n  toSubmitAdRequestInput,\n} from '@duncit/ad-request-form';",
  ],
  [
    "      const windowed = makeAdRequestSchema({ min: mock.window_min, max: mock.window_max });\n      const base = adRequestSchema.safeParse(mock);",
    "      // The messages come from the catalogue, so the schema takes a translator\n      // — the console's live one inside a portal, the package's own here.\n      const windowed = makeAdRequestSchema(\n        { min: mock.window_min, max: mock.window_max },\n        adRequestT,\n      );\n      const base = buildAdRequestSchema(adRequestT).safeParse(mock);",
  ],
]);

apply("packages/ad-request-form/src/index.ts", [
  [
    "export { useTranslation, type Translate } from './i18n/useTranslation';",
    "export { adRequestT, useTranslation, type Translate } from './i18n/useTranslation';",
  ],
]);

apply("packages/ad-request-form/docs/index.mdx", [
  ["  - 'adRequestSchema'", "  - 'buildAdRequestSchema'"],
  ["  - 'AD_POSITION_OPTIONS'", "  - 'adPositionOptions'"],
  [
    "adPositionLabel('EXPLORE_SCROLL');   // 'Explore Scroll'\nadPositionLabel('NEWSLETTER');       // 'NEWSLETTER'  ← unknown values pass through unchanged\nadTypeLabel('VIDEO');                // 'Video'",
    "adPositionLabel('EXPLORE_SCROLL', t);   // 'Explore Scroll'\nadPositionLabel('NEWSLETTER', t);       // 'NEWSLETTER'  ← unknown values pass through unchanged\nadTypeLabel('VIDEO', t);                // 'Video'",
  ],
  [
    "`adPositionLabel` never throws on an unrecognised placement; it returns the raw enum. If a portal\nstarts displaying SCREAMING_SNAKE in the UI, that is a placement missing from `AD_POSITION_OPTIONS`.",
    "Every label comes from the catalogue, so each of these takes the console's translator —\n`useTranslation().t` inside a component, `adRequestT` outside one (rule 38).\n\n`adPositionLabel` never throws on an unrecognised placement; it returns the raw enum. If a portal\nstarts displaying SCREAMING_SNAKE in the UI, that is a placement missing from `adPositionOptions`.",
  ],
  ["### `adRequestSchema.safeParse(...)` on a bad request", "### `buildAdRequestSchema(t).safeParse(...)` on a bad request"],
  [
    "| `adRequestSchema` | `ZodObject` | The contract; mirrors the server's `SubmitAdRequestInput` rules. |",
    "| `buildAdRequestSchema` | `(t: Translate) => ZodObject` | The contract; mirrors the server's `SubmitAdRequestInput` rules. Its messages come from `adRequest.errors.*`. |",
  ],
  [
    "| `AD_MEDIA_TYPE_OPTIONS` | `[{ value, label }]` | `IMAGE`, `VIDEO`. |\n| `AD_POSITION_OPTIONS` | `[{ value, label }]` | The nine placements, in menu order. |\n| `AD_STATUS_OPTIONS` | `[{ value, label }]` | `PENDING`, `APPROVED`, `LIVE`, `REJECTED`, `EXPIRED`. |",
    "| `adMediaTypeOptions` | `(t) => [{ value, label }]` | `IMAGE`, `VIDEO`. |\n| `adPositionOptions` | `(t) => [{ value, label }]` | The nine placements, in menu order. |\n| `adStatusOptions` | `(t) => [{ value, label }]` | `PENDING`, `APPROVED`, `LIVE`, `REJECTED`, `EXPIRED`. |",
  ],
  [
    "| `adPositionLabel` | `(position: string) => string` | Label, or the raw value if unknown. |\n| `adTypeLabel` | `(type: string) => string` | Label, or the raw value if unknown. |",
    "| `adPositionLabel` | `(position: string, t: Translate) => string` | Label, or the raw value if unknown. |\n| `adTypeLabel` | `(type: string, t: Translate) => string` | Label, or the raw value if unknown. |\n| `adRequestT` | `Translate` | A provider-free translator for code that runs outside React. |",
  ],
  [
    "`toSubmitAdRequestInput` re-runs `adRequestSchema.parse` before mapping. That is deliberate:",
    "`toSubmitAdRequestInput` re-runs the schema's `parse` before mapping. That is deliberate:",
  ],
  [
    "`AD_POSITION_OPTIONS` + `AD_PRICING_KEY_BY_POSITION` in the same change.",
    "`adPositionOptions` + `AD_PRICING_KEY_BY_POSITION` in the same change.",
  ],
]);
