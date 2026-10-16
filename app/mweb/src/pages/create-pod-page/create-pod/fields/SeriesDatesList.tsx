import { Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { POD_SERIES_SKIP_REASON_KEY } from '@duncit/utils';
import { formatDateTime } from '../../../../utils/dateFormat';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { SeriesPreviewDate } from './useSeriesPreview';

interface Props {
  dates: SeriesPreviewDate[];
  /** ISO starts the host unticked. */
  skipped: readonly string[];
  onToggle: (startAt: string, include: boolean) => void;
}

/**
 * The dates a recurring plan produces, one row each. A date that can run is a
 * checkbox the host may untick; one that cannot is shown greyed with the
 * venue's reason, so the host knows exactly which dates will go to the venue.
 */
export default function SeriesDatesList({ dates, skipped, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  const skip = new Set(skipped);
  return (
    <Stack spacing={0.25} data-testid="pod-series-dates" role="group" aria-label={t('mweb.podSeries.datesLabel')}>
      {dates.map((date) => {
        const when = formatDateTime(date.start_at);
        if (!date.available) {
          return (
            <Stack
              key={date.start_at}
              direction="row"
              spacing={1}
              data-testid={`pod-series-date-off-${date.start_at}`}
              sx={{ alignItems: 'center', pl: 1.5, py: 0.75, color: 'text.secondary' }}
            >
              <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>
                {when}
              </Typography>
              {date.reason && (
                <Typography variant="caption">· {t(POD_SERIES_SKIP_REASON_KEY[date.reason])}</Typography>
              )}
            </Stack>
          );
        }
        return (
          <FormControlLabel
            key={date.start_at}
            data-testid={`pod-series-date-${date.start_at}`}
            control={
              <Checkbox
                checked={!skip.has(date.start_at)}
                onChange={(e) => onToggle(date.start_at, e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                {date.price != null && date.price > 0
                  ? t('mweb.podSeries.dateWithPrice', { vars: { date: when, price: date.price } })
                  : when}
              </Typography>
            }
          />
        );
      })}
    </Stack>
  );
}
