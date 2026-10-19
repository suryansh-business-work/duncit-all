import { Checkbox, Divider, FormControlLabel, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatDateTime } from '../../../utils/dateFormat';
import type { SeriesBooking } from './useSeriesBooking';

interface Props {
  series: SeriesBooking;
  isFree: boolean;
  priceFormat: (amount: number) => string;
}

/** "Select all", then one tick row per open date: when it is, and (paid pods) its price. */
export default function SeriesDatePickList({ series, isFree, priceFormat }: Readonly<Props>) {
  const { t } = useTranslation();
  const total = series.openRows.length;
  const count = series.chosen.length;
  return (
    <Stack data-testid="series-booking-pick-list">
      <FormControlLabel
        control={
          <Checkbox
            checked={count > 0 && count === total}
            indeterminate={count > 0 && count < total}
            onChange={series.toggleAll}
            data-testid="series-booking-select-all"
          />
        }
        label={t('mweb.podSeriesBooking.selectAll')}
      />
      <Divider />
      {series.openRows.map((row) => (
        <FormControlLabel
          key={row.pod_doc_id}
          sx={{ mr: 0, '& .MuiFormControlLabel-label': { flex: 1 } }}
          control={
            <Checkbox
              checked={series.chosen.includes(row.pod_doc_id)}
              onChange={() => series.togglePicked(row.pod_doc_id)}
              data-testid={`series-booking-pick-${row.pod_doc_id}`}
            />
          }
          label={
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">{formatDateTime(row.start_at)}</Typography>
              {!isFree && (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {priceFormat(series.netFor(row))}
                </Typography>
              )}
            </Stack>
          }
        />
      ))}
    </Stack>
  );
}
