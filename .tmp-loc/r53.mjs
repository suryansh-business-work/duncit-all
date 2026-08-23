import { apply } from "./e.mjs";

apply("packages/ad-request-form/src/ad-request.types.ts", [
  [
    "      vars: { max: t('adRequest.days', { count: max, vars: { count: max } }) },",
    "      vars: { max: t('adRequest.days', { count: max }) },",
  ],
]);

// ---- AdRequestForm
apply("packages/ad-request-form/src/AdRequestForm.tsx", [
  [
    "import { AD_MEDIA_TYPE_OPTIONS, AD_POSITION_OPTIONS } from './ad-options';\nimport AdMediaField from './AdMediaField';\nimport {\n  AD_DURATION_FALLBACK,\n  makeAdRequestSchema,\n  type AdRequestFormProps,\n  type AdRequestFormValues,\n} from './ad-request.types';",
    "import { adMediaTypeOptions, adPositionOptions } from './ad-options';\nimport AdMediaField from './AdMediaField';\nimport { useTranslation, type Translate } from './i18n/useTranslation';\nimport {\n  AD_DURATION_FALLBACK,\n  makeAdRequestSchema,\n  type AdRequestFormProps,\n  type AdRequestFormValues,\n} from './ad-request.types';",
  ],
  [
    "function dayLabel(days: number): string {\n  if (days === 1) return '1 day';\n  if (days % 30 === 0) {\n    const months = days / 30;\n    return months === 1 ? '1 month' : `${months} months`;\n  }\n  if (days % 7 === 0) {\n    const weeks = days / 7;\n    return weeks === 1 ? '1 week' : `${weeks} weeks`;\n  }\n  return `${days} days`;\n}",
    "function dayLabel(days: number, t: Translate): string {\n  if (days > 1 && days % 30 === 0) return t('adRequest.months', { count: days / 30 });\n  if (days > 1 && days % 7 === 0) return t('adRequest.weeks', { count: days / 7 });\n  return t('adRequest.days', { count: days });\n}",
  ],
  [
    "  onSubmit,\n  submitLabel = 'Submit Ad Request',\n  durationWindow = AD_DURATION_FALLBACK,\n}: Readonly<AdRequestFormProps>) {",
    "  onSubmit,\n  submitLabel,\n  durationWindow = AD_DURATION_FALLBACK,\n}: Readonly<AdRequestFormProps>) {\n  const { t } = useTranslation();",
  ],
  [
    "  const schema = useMemo(() => makeAdRequestSchema(window), [window]);\n  const durationMarks = useMemo(\n    () => [\n      { value: window.min, label: dayLabel(window.min) },\n      { value: window.max, label: dayLabel(window.max) },\n    ],\n    [window]\n  );",
    "  const schema = useMemo(() => makeAdRequestSchema(window, t), [window, t]);\n  const durationMarks = useMemo(\n    () => [\n      { value: window.min, label: dayLabel(window.min, t) },\n      { value: window.max, label: dayLabel(window.max, t) },\n    ],\n    [window, t]\n  );",
  ],
  [
    "<RhfTextField control={control} name=\"ad_title\" label=\"Ad Title\" required hint=\"3–120 characters\" />",
    "<RhfTextField\n            control={control}\n            name=\"ad_title\"\n            label={t('adRequest.form.title')}\n            required\n            hint={t('adRequest.form.titleHint')}\n          />",
  ],
  [
    "            label=\"Ad Description\"\n            required\n            multiline\n            minRows={3}\n            hint=\"What the ad promotes (10–1000 characters)\"",
    "            label={t('adRequest.form.description')}\n            required\n            multiline\n            minRows={3}\n            hint={t('adRequest.form.descriptionHint')}",
  ],
  [
    "                label=\"Ad Type\"\n                select",
    "                label={t('adRequest.form.type')}\n                select",
  ],
  [
    "                helperText=\"Changing the type clears the uploaded media\"\n              >\n                {AD_MEDIA_TYPE_OPTIONS.map((option) => (",
    "                helperText={t('adRequest.form.typeHint')}\n              >\n                {adMediaTypeOptions(t).map((option) => (",
  ],
  [
    "<RhfTextField control={control} name=\"position\" label=\"Ad Position\" select hint=\"Auto shows the ad across every placement\">\n            {AD_POSITION_OPTIONS.map((option) => (",
    "<RhfTextField\n            control={control}\n            name=\"position\"\n            label={t('adRequest.form.position')}\n            select\n            hint={t('adRequest.form.positionHint')}\n          >\n            {adPositionOptions(t).map((option) => (",
  ],
  [
    "                label=\"Ad Start Date\"",
    "                label={t('adRequest.form.startDate')}",
  ],
  [
    "                    helperText: fieldState.error?.message ?? 'Today or later',",
    "                    helperText: fieldState.error?.message ?? t('adRequest.form.startDateHint'),",
  ],
  [
    "                  Ad Duration: {field.value} {field.value === 1 ? 'day' : 'days'} (\n                  {dayLabel(window.min)} – {dayLabel(window.max)})\n                </Typography>",
    "                  {t('adRequest.form.duration', {\n                    vars: {\n                      days: t('adRequest.days', { count: field.value }),\n                      from: dayLabel(window.min, t),\n                      to: dayLabel(window.max, t),\n                    },\n                  })}\n                </Typography>",
  ],
  [
    "<RhfTextField control={control} name=\"redirect_url\" label=\"Redirect URL\" hint=\"Optional — where the ad opens; must be an http(s) link\" />",
    "<RhfTextField\n            control={control}\n            name=\"redirect_url\"\n            label={t('adRequest.form.redirectUrl')}\n            hint={t('adRequest.form.redirectUrlHint')}\n          />",
  ],
  [
    "<RhfTextField control={control} name=\"target_audience\" label=\"Target Audience\" multiline minRows={2} hint=\"Optional — describe who the ad should reach\" />",
    "<RhfTextField\n            control={control}\n            name=\"target_audience\"\n            label={t('adRequest.form.targetAudience')}\n            multiline\n            minRows={2}\n            hint={t('adRequest.form.targetAudienceHint')}\n          />",
  ],
  [
    "              {submitLabel}\n            </Button>",
    "              {submitLabel ?? t('adRequest.form.submit')}\n            </Button>",
  ],
]);
