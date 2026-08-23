import { apply } from "./e.mjs";

apply("packages/ui/src/AttendanceChip.tsx", [
  [
    "import { Chip, Tooltip } from '@mui/material';",
    "import { Chip, Tooltip } from '@mui/material';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
  [
    "export default function AttendanceChip({ attendance, size = 'small' }: Readonly<Props>) {\n  if (!attendance || attendance.booked_seats === 0) {",
    "export default function AttendanceChip({ attendance, size = 'small' }: Readonly<Props>) {\n  const { t } = useTranslation();\n  if (!attendance || attendance.booked_seats === 0) {",
  ],
  [
    "      <Tooltip title=\"No ticket on this pod has been scanned yet\">\n        <Chip size={size} variant=\"outlined\" color=\"warning\" label=\"Not scanned\" />",
    "      <Tooltip title={t('ui.attendance.notScannedHint')}>\n        <Chip\n          size={size}\n          variant=\"outlined\"\n          color=\"warning\"\n          label={t('ui.attendance.notScanned')}\n        />",
  ],
  [
    "    <Tooltip title=\"Seats scanned in at the door — a completed pod is settled on these\">",
    "    <Tooltip title={t('ui.attendance.scannedHint')}>",
  ],
  [
    "        label={`${attendance.attended_seats}/${attendance.booked_seats} scanned`}",
    "        label={t('ui.attendance.scannedCount', {\n          vars: { attended: attendance.attended_seats, booked: attendance.booked_seats },\n        })}",
  ],
]);

apply("packages/ui/src/LanguageSelect.tsx", [
  [
    "import TranslateIcon from '@mui/icons-material/Translate';",
    "import TranslateIcon from '@mui/icons-material/Translate';\nimport { useTranslation } from './i18n/useTranslation';",
  ],
  [
    "  onChange: (code: string) => void;\n  label?: string;",
    "  onChange: (code: string) => void;\n  /** Defaults to the shared `Language` copy in the reader's language. */\n  label?: string;",
  ],
  [
    "  label = 'Language',\n  helperText,\n  disabled = false,\n  size = 'small',\n  fullWidth = true,\n}: Readonly<LanguageSelectProps>) {\n  if (options.length < 2) return null;",
    "  label,\n  helperText,\n  disabled = false,\n  size = 'small',\n  fullWidth = true,\n}: Readonly<LanguageSelectProps>) {\n  const { t } = useTranslation();\n  if (options.length < 2) return null;",
  ],
  [
    "      select\n      label={label}",
    "      select\n      label={label ?? t('ui.language.label')}",
  ],
]);

apply("packages/ui/src/QueryGuard.tsx", [
  [
    "import { mergeSx } from './mergeSx';",
    "import { useTranslation } from './i18n/useTranslation';\nimport { mergeSx } from './mergeSx';",
  ],
  [
    "  /** Default 'Not found.'. */\n  notFoundText?: ReactNode;",
    "  /** Defaults to the shared `Not found.` copy in the reader's language. */\n  notFoundText?: ReactNode;",
  ],
  [
    "  notFoundText = 'Not found.',\n  notFoundSeverity = 'info',\n  spinnerSize,\n  spinnerSx,\n  children,\n}: Readonly<QueryGuardProps>) {\n  if (loading) {",
    "  notFoundText,\n  notFoundSeverity = 'info',\n  spinnerSize,\n  spinnerSx,\n  children,\n}: Readonly<QueryGuardProps>) {\n  const { t } = useTranslation();\n  if (loading) {",
  ],
  [
    "    return <Alert severity={notFoundSeverity}>{notFoundText}</Alert>;",
    "    return <Alert severity={notFoundSeverity}>{notFoundText ?? t('ui.queryGuard.notFound')}</Alert>;",
  ],
]);

apply("packages/ui/src/BackHeader.tsx", [
  [
    "  /** Default 'Back'. */",
    "  /** Defaults to the shared `Back` copy in the reader's language. */",
  ],
  [
    "  backAriaLabel = 'Back',",
    "  backAriaLabel,",
  ],
  [
    "      <BackIcon onBack={onBack} backTo={backTo} backSize={backSize} backSx={backSx} ariaLabel={backAriaLabel} />",
    "      <BackIcon\n        onBack={onBack}\n        backTo={backTo}\n        backSize={backSize}\n        backSx={backSx}\n        ariaLabel={backAriaLabel ?? t('ui.backHeader.back')}\n      />",
  ],
  [
    "  titleSx,\n  sx,\n}: Readonly<BackHeaderProps>) {\n  return (",
    "  titleSx,\n  sx,\n}: Readonly<BackHeaderProps>) {\n  const { t } = useTranslation();\n  return (",
  ],
]);

apply("packages/ui/src/PodParticipationTimeline.tsx", [
  [
    '                label="In progress"',
    "                label={t('ui.timeline.inProgress')}",
  ],
]);

apply("packages/ui/src/ModerationBlockedDialog.tsx", [
  [
    "const DEFAULT_TITLE = 'Fix these before publishing';\nconst DEFAULT_DESCRIPTION =\n  'Our AI check found content that breaks the community guidelines, so it was not saved. Fix the items below and try again.';\n",
    "",
  ],
  [
    "  title = DEFAULT_TITLE,\n  description = DEFAULT_DESCRIPTION,\n}: Readonly<ModerationBlockedDialogProps>) {\n  return (",
    "  title,\n  description,\n}: Readonly<ModerationBlockedDialogProps>) {\n  const { t } = useTranslation();\n  return (",
  ],
  [
    "        <GppMaybeIcon color=\"error\" /> {title}",
    "        <GppMaybeIcon color=\"error\" /> {title ?? t('ui.moderation.title')}",
  ],
  [
    "          {description}",
    "          {description ?? t('ui.moderation.description')}",
  ],
]);
