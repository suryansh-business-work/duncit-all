import { useState } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { isValid, parseISO } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { PERIOD_OPTIONS } from './queries';
import { CALENDAR_OPTIONS, monthRange, presetRange, toDay, type CalendarMode } from './period-presets';
import type { PeriodState } from './period-state';

/** A rolling length in days, or one of the calendar periods. */
type Mode = number | CalendarMode;

const fromDay = (day: string | undefined) => (day ? parseISO(day) : null);
const PICKER = { textField: { size: 'small', sx: { width: 170 } } } as const;

interface Props {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
}

/**
 * 7 / 30 / 90 days or 12 months ending now; or a calendar period — this month
 * so far, last month, any one month, or a custom From–To. A picked month or
 * range is applied only once it is complete and valid, so the page never
 * reloads on a half-typed date.
 */
export default function PeriodControls({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>(value.range ? 'custom' : value.days);
  const [draft, setDraft] = useState({ from: fromDay(value.range?.from), to: fromDay(value.range?.to) });
  const [month, setMonth] = useState<Date | null>(null);

  const pick = (next: Mode) => {
    setMode(next);
    if (typeof next === 'number') {
      onChange({ ...value, days: next, range: null });
      return;
    }
    const range = presetRange(next);
    if (range) onChange({ ...value, range });
  };
  const pickMonth = (date: Date | null) => {
    setMonth(date);
    if (date && isValid(date)) onChange({ ...value, range: monthRange(date) });
  };
  const setRange = (from: Date | null, to: Date | null) => {
    setDraft({ from, to });
    if (from && to && isValid(from) && isValid(to) && from <= to) {
      onChange({ ...value, range: { from: toDay(from), to: toDay(to) } });
    }
  };
  const rolling = typeof mode === 'number' ? mode : null;
  const calendar = typeof mode === 'string' ? mode : null;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={rolling}
        onChange={(_event, next: number | null) => {
          if (next !== null) pick(next);
        }}
        aria-label={t('analytics.page.period')}
      >
        {PERIOD_OPTIONS.map((option) => (
          <ToggleButton key={option.days} value={option.days} data-testid={`analytics-period-${option.days}`}>
            {t(option.label)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={calendar}
        onChange={(_event, next: CalendarMode | null) => {
          if (next !== null) pick(next);
        }}
        aria-label={t('analytics.page.calendarPeriod')}
      >
        {CALENDAR_OPTIONS.map((option) => (
          <ToggleButton key={option.mode} value={option.mode} data-testid={`analytics-period-${option.testId}`}>
            {t(option.label)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {mode === 'month' && (
        <DatePicker
          label={t('analytics.page.month')}
          views={['year', 'month']}
          openTo="month"
          value={month}
          onChange={pickMonth}
          disableFuture
          slotProps={PICKER}
        />
      )}
      {mode === 'custom' && (
        <Stack direction="row" spacing={1}>
          <DatePicker
            label={t('analytics.page.from')}
            value={draft.from}
            onChange={(date) => setRange(date, draft.to)}
            disableFuture
            slotProps={PICKER}
          />
          <DatePicker
            label={t('analytics.page.to')}
            value={draft.to}
            onChange={(date) => setRange(draft.from, date)}
            disableFuture
            minDate={draft.from ?? undefined}
            slotProps={PICKER}
          />
        </Stack>
      )}
    </Stack>
  );
}
