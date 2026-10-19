import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers';
import { POD_SERIES_SKIP_REASON_KEY, ymdInZone } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import { formatDay, useDateFormat } from '../../../../utils/dateFormat';
import type { CreatePodForm } from '../create-pod.types';
import {
  SERIES_DAY_LABEL_KEY,
  SERIES_DAY_STATES,
  SERIES_DAY_SX,
  SeriesDayContext,
  seriesDayMarks,
  type SeriesDayContextValue,
  type SeriesDayState,
} from './seriesDayMarks';
import SeriesDayCell from './SeriesDayCell';
import type { SeriesPreviewDate } from './useSeriesPreview';

const toggled = (list: readonly string[], value: string) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/**
 * The recurring plan on a calendar, from the first date to the end day. Each
 * date the server previewed is marked — runs, venue opens a slot on request,
 * cannot run (with why), or left out by the host. A repeating plan's dates are
 * tapped to leave them out (or bring them back); a hand-picked plan's days are
 * tapped to add or drop them. Native twin: SeriesCalendar.
 */
export default function SeriesCalendar({ form, dates }: Readonly<{ form: CreatePodForm; dates: SeriesPreviewDate[] }>) {
  const { t } = useTranslation();
  const { timeZone } = useDateFormat();
  const { watch, setValue, formState: { errors } } = form;
  const custom = watch('repeat_frequency') === 'CUSTOM';
  const skipped = watch('repeat_skip_dates');
  const customDays = watch('repeat_custom_days');
  const endDay = watch('repeat_ends_on');
  const first = watch('pod_date_time');
  const firstDay = first ? ymdInZone(first.toISOString(), timeZone) : null;

  const marks = useMemo(
    () => seriesDayMarks({ dates, skipped: custom ? [] : skipped, customDays: custom ? customDays : [], timeZone }),
    [dates, skipped, customDays, custom, timeZone]
  );
  const context = useMemo<SeriesDayContextValue>(() => {
    const reasonOf: SeriesDayContextValue['reasonOf'] = (mark) =>
      mark.state === 'CANNOT_RUN' && mark.reason ? t(POD_SERIES_SKIP_REASON_KEY[mark.reason]) : null;
    return {
      markOf: (day) => marks.get(day),
      reasonOf,
      labelOf: (day, mark) =>
        t('mweb.podSeries.dayLabel', {
          vars: { date: formatDay(day), status: reasonOf(mark) ?? t(SERIES_DAY_LABEL_KEY[mark.state]) },
        }),
    };
  }, [marks, t]);

  if (!firstDay || !endDay) return null;

  const tappable = (day: string): boolean => {
    if (custom) return day > firstDay && day <= endDay;
    const mark = marks.get(day);
    return !!mark?.startAt && mark.state !== 'CANNOT_RUN';
  };
  const tap = (day: string) => {
    if (!tappable(day)) return;
    if (custom) {
      setValue('repeat_custom_days', toggled(customDays, day), { shouldDirty: true, shouldValidate: true });
      return;
    }
    const startAt = marks.get(day)?.startAt;
    if (startAt) setValue('repeat_skip_dates', toggled(skipped, startAt), { shouldDirty: true });
  };

  return (
    <Stack spacing={1} data-testid="pod-series-calendar">
      <Box>
        <Typography variant="subtitle2" component="h4">{t('mweb.podSeries.calendarTitle')}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {custom ? t('mweb.podSeries.customHint') : t('mweb.podSeries.calendarHint')}
        </Typography>
      </Box>
      <SeriesDayContext.Provider value={context}>
        <DateCalendar
          value={null}
          onChange={(next: Date | null) => {
            if (next) tap(format(next, 'yyyy-MM-dd'));
          }}
          referenceDate={parseISO(firstDay)}
          minDate={parseISO(firstDay)}
          maxDate={parseISO(endDay)}
          shouldDisableDate={(day: Date) => !tappable(format(day, 'yyyy-MM-dd'))}
          views={['day']}
          slots={{ day: SeriesDayCell }}
          aria-label={t('mweb.podSeries.datesLabel')}
          sx={{ width: '100%', maxWidth: 360, mx: 'auto' }}
        />
      </SeriesDayContext.Provider>
      <Stack component="ul" direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, listStyle: 'none', p: 0, m: 0 }}>
        {SERIES_DAY_STATES.map((state) => (
          <LegendItem key={state} state={state} label={t(SERIES_DAY_LABEL_KEY[state])} />
        ))}
      </Stack>
      {errors.repeat_custom_days?.message && (
        <FormHelperText error role="alert" data-testid="pod-repeat-custom-error">
          {errors.repeat_custom_days.message}
        </FormHelperText>
      )}
    </Stack>
  );
}

function LegendItem({ state, label }: Readonly<{ state: SeriesDayState; label: string }>) {
  return (
    <Stack component="li" direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box
        aria-hidden
        sx={[
          { width: (theme) => theme.spacing(2), height: (theme) => theme.spacing(2), borderRadius: '50%', flexShrink: 0 },
          SERIES_DAY_SX[state],
        ]}
      />
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}
