import { apply } from "./e.mjs";

apply("packages/ad-request-form/src/ad-request.types.ts", [
  [
    "import type { Translate } from './i18n/useTranslation';",
    "import { adRequestT, type Translate } from './i18n/useTranslation';",
  ],
  [
    "  const cast = buildAdRequestSchema(((key: string) => key) as Translate).parse(values);",
    "  const cast = buildAdRequestSchema(adRequestT).parse(values);",
  ],
  [
    " * Runs the schema again for its coercions and defaults, never for its messages\n * — the form has already blocked anything invalid — so the key itself is a fine\n * stand-in for a translator here.",
    " * Runs the schema again for its coercions and defaults, never for its messages\n * — the form has already blocked anything invalid — so the package's own\n * provider-free translator is enough here.",
  ],
]);

apply("packages/ad-request-form/src/ad-options.test.ts", [
  [
    "import {\n  AD_MEDIA_TYPE_OPTIONS,\n  AD_PRICING_KEY_BY_POSITION,\n  AD_POSITION_OPTIONS,\n  adPositionLabel,\n  adTypeLabel,\n  formatAdCost,\n} from './ad-options';",
    "import {\n  AD_PRICING_KEY_BY_POSITION,\n  adMediaTypeOptions,\n  adPositionOptions,\n  adPositionLabel,\n  adTypeLabel,\n  formatAdCost,\n} from './ad-options';\nimport { adRequestT as t } from './i18n/useTranslation';\n\nconst AD_POSITION_OPTIONS = adPositionOptions(t);\nconst AD_MEDIA_TYPE_OPTIONS = adMediaTypeOptions(t);",
  ],
  ["adPositionLabel('EXPLORE_SCROLL')", "adPositionLabel('EXPLORE_SCROLL', t)"],
  ["adPositionLabel('AUTO')", "adPositionLabel('AUTO', t)"],
  ["adPositionLabel('SOMETHING_NEW')", "adPositionLabel('SOMETHING_NEW', t)"],
  ["expect(adPositionLabel(option.value)).toBe(option.label);", "expect(adPositionLabel(option.value, t)).toBe(option.label);"],
  ["adTypeLabel('IMAGE')", "adTypeLabel('IMAGE', t)"],
  ["adTypeLabel('VIDEO')", "adTypeLabel('VIDEO', t)"],
  ["adTypeLabel('GIF')", "adTypeLabel('GIF', t)"],
  ["expect(adTypeLabel(option.value)).toBe(option.label);", "expect(adTypeLabel(option.value, t)).toBe(option.label);"],
]);
