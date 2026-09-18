import { useState } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { PERIOD_OPTIONS } from './queries';
import type { PeriodState } from './period-state';

/** The toggle value that opens the two date fields. A real period is never 0 days. */
const CUSTOM = 0;
const toDay = (date: Date) => format(date, 'yyyy-MM-dd');
const fromDay = (day: string | undefined) => (day ? parseISO(day) : null);

interface Props {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
}

/**
 * 7 / 30 / 90 days, 12 months, or Custom — which opens a From and a To date.
 * A range is applied only once both dates are valid and in order, so the page
 * never reloads on a half-typed date.
 */
export default function PeriodControls({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [custom, setCustom] = useState(Boolean(value.range));
  const [draft, setDraft] = useState({ from: fromDay(value.range?.from), to: fromDay(value.range?.to) });

  const pick = (next: number) => {
    if (next === CUSTOM) {
      setCustom(true);
      return;
    }
    setCustom(false);
    onChange({ ...value, days: next, range: null });
  };
  const setRange = (from: Date | null, to: Date | null) => {
    setDraft({ from, to });
    if (from && to && isValid(from) && isValid(to) && from <= to) {
      onChange({ ...value, range: { from: toDay(from), to: toDay(to) } });
    }
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={custom ? CUSTOM : value.days}
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
        <ToggleButton value={CUSTOM} data-testid="analytics-period-custom">
          {t('analytics.page.custom')}
        </ToggleButton>
      </ToggleButtonGroup>
      {custom && (
        <Stack direction="row" spacing={1}>
          <DatePicker
            label={t('analytics.page.from')}
            value={draft.from}
            onChange={(date) => setRange(date, draft.to)}
            disableFuture
            slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
          />
          <DatePicker
            label={t('analytics.page.to')}
            value={draft.to}
            onChange={(date) => setRange(draft.from, date)}
            disableFuture
            minDate={draft.from ?? undefined}
            slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
          />
        </Stack>
      )}
    </Stack>
  );
}
