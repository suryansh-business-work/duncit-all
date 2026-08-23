import { apply } from "./e.mjs";

apply("packages/availability-calendar/src/RecurringAvailabilityDialog.tsx", [
  [
    "import { wholeDayWindow } from './slot-window';",
    "import { useTranslation } from '@duncit/app-settings';\nimport { wholeDayWindow } from './slot-window';",
  ],
  [
    "export default function RecurringAvailabilityDialog({ open, onClose, onAdd }: Readonly<Props>) {",
    "export default function RecurringAvailabilityDialog({ open, onClose, onAdd }: Readonly<Props>) {\n  const { t } = useTranslation();",
  ],
]);

// ---- AvailabilityCalendar: the on-leave badge
apply("packages/availability-calendar/src/AvailabilityCalendar.tsx", [
  ['aria-label="Venue on leave"', "aria-label={t('shell.availability.onLeave')}"],
]);

// ---- DayDrawer
apply("packages/availability-calendar/src/DayDrawer/index.tsx", [
  ['<IconButton size="small" onClick={onClose} aria-label="Close">', "<IconButton size=\"small\" onClick={onClose} aria-label={t('shell.common.close')}>"],
]);

// ---- AddSlotForm
apply("packages/availability-calendar/src/DayDrawer/AddSlotForm.tsx", [
  ["      setError(e instanceof Error ? e.message : 'Could not create slot');", "      setError(e instanceof Error ? e.message : t('shell.availability.createFailed'));"],
  ["    setError('End must be after start.');", "    setError(t('shell.availability.endAfterStart'));"],
  ["    setError('Start time must be in the future.');", "    setError(t('shell.availability.startInFuture'));"],
]);

// ---- SlotList
apply("packages/availability-calendar/src/DayDrawer/SlotList.tsx", [
  ["      setError(e instanceof Error ? e.message : 'Could not update slot');", "      setError(e instanceof Error ? e.message : t('shell.availability.updateFailed'));"],
  ["      setError(e instanceof Error ? e.message : 'Could not delete slot');", "      setError(e instanceof Error ? e.message : t('shell.availability.deleteFailed'));"],
  ["<DialogTitle>Delete this slot?</DialogTitle>", "<DialogTitle>{t('shell.availability.deleteTitle')}</DialogTitle>"],
  [
    "<DialogContentText>This permanently removes the time slot. Booked slots cannot be deleted.</DialogContentText>",
    "<DialogContentText>{t('shell.availability.deleteBody')}</DialogContentText>",
  ],
  [
    "<Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>",
    "<Button onClick={() => setConfirmDeleteId(null)}>{t('shell.common.cancel')}</Button>",
  ],
]);
