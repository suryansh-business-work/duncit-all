import { apply } from "./e.mjs";

// ---- AdMediaField
apply("packages/ad-request-form/src/AdMediaField.tsx", [
  [
    "import type { AdMediaType } from './ad-options';",
    "import type { AdMediaType } from './ad-options';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
  [
    "  const [open, setOpen] = useState(false);\n  const isVideo = adType === 'VIDEO';\n  const mediaLabel = isVideo ? 'video' : 'image';\n  const defaultHint = isVideo ? 'Upload the ad video (up to 100MB)' : 'Upload the ad image';",
    "  const { t } = useTranslation();\n  const [open, setOpen] = useState(false);\n  const isVideo = adType === 'VIDEO';\n  // Each wording is its own catalogue row rather than a noun slotted into a\n  // sentence: a language that inflects the verb for the noun cannot be built\n  // by concatenation.\n  const uploadLabel = isVideo ? t('adRequest.media.uploadVideo') : t('adRequest.media.uploadImage');\n  const replaceLabel = isVideo\n    ? t('adRequest.media.replaceVideo')\n    : t('adRequest.media.replaceImage');\n  const chooseLabel = isVideo ? t('adRequest.media.chooseVideo') : t('adRequest.media.chooseImage');\n  const defaultHint = isVideo ? t('adRequest.media.hintVideo') : t('adRequest.media.hintImage');",
  ],
  [
    "        Ad Media\n        {required",
    "        {t('adRequest.media.label')}\n        {required",
  ],
  [
    "          {value ? `Replace ${mediaLabel}` : `Upload ${mediaLabel}`}",
    "          {value ? replaceLabel : uploadLabel}",
  ],
  [
    '            <Box component="img" src={value} alt="Ad media preview" sx={PREVIEW_SX} />',
    "            <Box component=\"img\" src={value} alt={t('adRequest.media.previewAlt')} sx={PREVIEW_SX} />",
  ],
  [
    "        title={`Choose ad ${mediaLabel}`}",
    "        title={chooseLabel}",
  ],
]);

// ---- EstimateCard
apply("packages/ad-request-form/src/EstimateCard.tsx", [
  [
    "import { AD_PRICING_KEY_BY_POSITION, adPositionLabel, formatAdCost, type AdPosition, type AdPricing } from './ad-options';",
    "import {\n  AD_PRICING_KEY_BY_POSITION,\n  adPositionLabel,\n  formatAdCost,\n  type AdPosition,\n  type AdPricing,\n} from './ad-options';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
  [
    "export default function EstimateCard({ pricing, loading, position, durationDays }: Readonly<EstimateCardProps>) {\n  if (loading || !pricing) {",
    "export default function EstimateCard({ pricing, loading, position, durationDays }: Readonly<EstimateCardProps>) {\n  const { t } = useTranslation();\n  if (loading || !pricing) {",
  ],
  [
    "          <Typography variant=\"subtitle1\" fontWeight={700} gutterBottom>\n            Estimated Cost\n          </Typography>\n          <Skeleton height={28} />",
    "          <Typography variant=\"subtitle1\" fontWeight={700} gutterBottom>\n            {t('adRequest.estimate.title')}\n          </Typography>\n          <Skeleton height={28} />",
  ],
  [
    "  const daysLabel = durationDays === 1 ? '1 day' : `${durationDays} days`;",
    "  const daysLabel = t('adRequest.days', { count: durationDays });",
  ],
  [
    "        <Typography variant=\"subtitle1\" fontWeight={700} gutterBottom>\n          Estimated Cost\n        </Typography>",
    "        <Typography variant=\"subtitle1\" fontWeight={700} gutterBottom>\n          {t('adRequest.estimate.title')}\n        </Typography>",
  ],
  [
    "          <InfoRow variant=\"split\" label={`${adPositionLabel(position)} · per day`} value={formatAdCost(perDay, symbol)} />\n          <InfoRow variant=\"split\" label=\"Duration\" value={daysLabel} />\n          <Divider />\n          <InfoRow variant=\"split\" bold label=\"Total estimate\" value={formatAdCost(perDay * durationDays, symbol)} />",
    "          <InfoRow\n            variant=\"split\"\n            label={t('adRequest.estimate.perDay', {\n              vars: { position: adPositionLabel(position, t) },\n            })}\n            value={formatAdCost(perDay, symbol)}\n          />\n          <InfoRow variant=\"split\" label={t('adRequest.estimate.duration')} value={daysLabel} />\n          <Divider />\n          <InfoRow\n            variant=\"split\"\n            bold\n            label={t('adRequest.estimate.total')}\n            value={formatAdCost(perDay * durationDays, symbol)}\n          />",
  ],
  [
    "          The final cost is confirmed by the Marketing team when your request is approved.\n        </Typography>",
    "          {t('adRequest.estimate.footnote')}\n        </Typography>",
  ],
]);

apply("packages/ad-request-form/src/index.ts", [
  [
    "export {\n  AD_DURATION_FALLBACK,\n  adRequestSchema,\n  makeAdRequestSchema,",
    "export { useTranslation, type Translate } from './i18n/useTranslation';\nexport {\n  AD_DURATION_FALLBACK,\n  buildAdRequestSchema,\n  makeAdRequestSchema,",
  ],
]);
