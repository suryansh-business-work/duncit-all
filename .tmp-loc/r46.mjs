import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/shell.ts", [
  [
    "      onLeave: 'Venue on leave',",
    "      onLeave: 'Venue on leave',\n      leaveTag: 'LEAVE',",
  ],
]);

apply("packages/availability-calendar/src/AvailabilityCalendar.tsx", [
  [
    "import { slotCoveredDays } from './slot-window';",
    "import { useTranslation } from '@duncit/app-settings';\nimport { slotCoveredDays } from './slot-window';",
  ],
  [
    "function DayHeader({ date, isDayView, isToday, isHoliday }: Readonly<DayHeaderProps>) {\n  return (",
    "function DayHeader({ date, isDayView, isToday, isHoliday }: Readonly<DayHeaderProps>) {\n  const { t } = useTranslation();\n  return (",
  ],
  [
    "        <Typography variant=\"caption\" sx={{ fontSize: 9, fontWeight: 800 }} aria-label={t('shell.availability.onLeave')}>\n          LEAVE\n        </Typography>",
    "        <Typography\n          variant=\"caption\"\n          sx={{ fontSize: 9, fontWeight: 800 }}\n          aria-label={t('shell.availability.onLeave')}\n        >\n          {t('shell.availability.leaveTag')}\n        </Typography>",
  ],
]);

apply("packages/availability-calendar/src/DayDrawer/index.tsx", [
  [
    "import { formatDate } from '@duncit/datetime';",
    "import { formatDate, } from '@duncit/datetime';\nimport { useTranslation } from '@duncit/app-settings';",
  ],
  [
    "}: Readonly<Props>) {",
    "}: Readonly<Props>) {\n  const { t } = useTranslation();",
  ],
]);

apply("packages/availability-calendar/src/DayDrawer/SlotList.tsx", [
  [
    "export default function SlotList({ slots, onToggleBlock, onDelete }: Readonly<Props>) {",
    "export default function SlotList({ slots, onToggleBlock, onDelete }: Readonly<Props>) {\n  const { t } = useTranslation();",
  ],
]);
