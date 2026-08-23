import { apply } from "./e.mjs";

// shell.availability gains the recurring dialog + drawer copy
apply("packages/i18n/src/bundles/shell.ts", [
  [
    "      priceHint: 'Leave 0 for a free slot',\n      notes: 'Notes (optional)',\n    },",
    "      priceHint: 'Leave 0 for a free slot',\n      notes: 'Notes (optional)',\n      // The calendar grid + its day drawer.\n      onLeave: 'Venue on leave',\n      closeDrawer: 'Close',\n      createFailed: 'Could not create slot',\n      updateFailed: 'Could not update slot',\n      deleteFailed: 'Could not delete slot',\n      endAfterStart: 'End must be after start.',\n      startInFuture: 'Start time must be in the future.',\n      deleteTitle: 'Delete this slot?',\n      deleteBody:\n        'This permanently removes the time slot. Booked slots cannot be deleted.',\n      // The \"same window every day\" bulk dialog.\n      recurringTitle: 'Recurring availability',\n      recurringHint:\n        'Add the same daily time window across a date range (up to {days} days ahead).',\n      recurringWholeDayHint: 'Each day becomes one whole-day slot — no time selection needed.',\n      dailyStart: 'Daily start',\n      dailyEnd: 'Daily end',\n      recurringPriceHint: 'Applied to every slot. 0 = free.',\n      addToCalendar: 'Add to calendar',\n      adding: 'Adding…',\n      pickDates: 'Pick the start and end date.',\n      endDateAfterStart: 'End date must be on or after the start date.',\n      pickTimes: 'Pick the daily start and end time.',\n      dailyEndAfterStart: 'Daily end time must be after the start time.',\n      noUpcomingSlots: 'That range has no upcoming slots.',\n      addFailed: 'Could not add slots',\n    },",
  ],
]);

apply("packages/availability-calendar/src/RecurringAvailabilityDialog.tsx", [
  [
    "  const validate = (): string | null => {\n    if (!startDate || !endDate) return 'Pick the start and end date.';\n    if (isBefore(endDate, startDate)) return 'End date must be on or after the start date.';\n    if (wholeDay) return null;\n    if (!startTime || !endTime) return 'Pick the daily start and end time.';\n    if (!isAfter(combineDateAndTime(startDate, endTime), combineDateAndTime(startDate, startTime))) {\n      return 'Daily end time must be after the start time.';\n    }\n    return null;\n  };",
    "  const validate = (): string | null => {\n    if (!startDate || !endDate) return t('shell.availability.pickDates');\n    if (isBefore(endDate, startDate)) return t('shell.availability.endDateAfterStart');\n    if (wholeDay) return null;\n    if (!startTime || !endTime) return t('shell.availability.pickTimes');\n    if (!isAfter(combineDateAndTime(startDate, endTime), combineDateAndTime(startDate, startTime))) {\n      return t('shell.availability.dailyEndAfterStart');\n    }\n    return null;\n  };",
  ],
  [
    "      setError('That range has no upcoming slots.');",
    "      setError(t('shell.availability.noUpcomingSlots'));",
  ],
  [
    "      setError(e instanceof Error ? e.message : 'Could not add slots');",
    "      setError(e instanceof Error ? e.message : t('shell.availability.addFailed'));",
  ],
  [
    "        Recurring availability\n        <IconButton onClick={handleClose} aria-label=\"Close\" sx={{ position: 'absolute', right: 8, top: 8 }}>",
    "        {t('shell.availability.recurringTitle')}\n        <IconButton\n          onClick={handleClose}\n          aria-label={t('shell.common.close')}\n          sx={{ position: 'absolute', right: 8, top: 8 }}\n        >",
  ],
  [
    "            Add the same daily time window across a date range (up to {MAX_FUTURE_DAYS} days ahead).\n          </Typography>",
    "            {t('shell.availability.recurringHint', { vars: { days: MAX_FUTURE_DAYS } })}\n          </Typography>",
  ],
  [
    "                  Whole day\n                </Typography>",
    "                  {t('shell.slots.wholeDay')}\n                </Typography>",
  ],
  [
    "                  Each day becomes one whole-day slot — no time selection needed.\n                </Typography>",
    "                  {t('shell.availability.recurringWholeDayHint')}\n                </Typography>",
  ],
  ['            label="Start date"', "            label={t('shell.availability.startDate')}"],
  ['            label="End date"', "            label={t('shell.availability.endDate')}"],
  [
    "              <TimePicker label=\"Daily start\" value={startTime} onChange={setStartTime} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />\n              <TimePicker label=\"Daily end\" value={endTime} onChange={setEndTime} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />",
    "              <TimePicker\n                label={t('shell.availability.dailyStart')}\n                value={startTime}\n                onChange={setStartTime}\n                slotProps={{ textField: { fullWidth: true, size: 'small' } }}\n              />\n              <TimePicker\n                label={t('shell.availability.dailyEnd')}\n                value={endTime}\n                onChange={setEndTime}\n                slotProps={{ textField: { fullWidth: true, size: 'small' } }}\n              />",
  ],
  [
    "            label=\"Price (₹)\"",
    "            label={t('shell.availability.price')}",
  ],
  [
    "            helperText=\"Applied to every slot. 0 = free.\"",
    "            helperText={t('shell.availability.recurringPriceHint')}",
  ],
  [
    "        <Button onClick={handleClose}>Cancel</Button>\n        <Button variant=\"contained\" disabled={saving} onClick={handleAdd}>\n          {saving ? 'Adding…' : 'Add to calendar'}\n        </Button>",
    "        <Button onClick={handleClose}>{t('shell.common.cancel')}</Button>\n        <Button variant=\"contained\" disabled={saving} onClick={handleAdd}>\n          {saving ? t('shell.availability.adding') : t('shell.availability.addToCalendar')}\n        </Button>",
  ],
]);
