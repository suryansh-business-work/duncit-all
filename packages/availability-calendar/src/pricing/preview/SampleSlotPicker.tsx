import { Alert, MenuItem, TextField } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { parseIsoDay } from '@duncit/datetime';
import { rupees } from '../format';
import type { PricingSlotValues } from '../form/venue-pricing.types';
import type { SampleBooking } from '../types';

interface Props {
  slots: PricingSlotValues[];
  sample: SampleBooking;
  onPick: (start: string, end: string) => void;
}

/** A per-slot venue's sample booking is one of the slots that runs on the sample's weekday. */
export default function SampleSlotPicker({ slots, sample, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const weekday = parseIsoDay(sample.date)?.getDay();
  const onDay = slots.filter((s) => weekday !== undefined && s.days_of_week.includes(weekday));
  if (onDay.length === 0) return <Alert severity="info">{t('venuePricing.preview.noSlotThatDay')}</Alert>;

  const value = `${sample.start}-${sample.end}`;
  const known = onDay.some((s) => `${s.start_time}-${s.end_time}` === value);
  return (
    <TextField
      select
      size="small"
      fullWidth
      label={t('venuePricing.preview.slot')}
      value={known ? value : ''}
      onChange={(e) => {
        const [start, end] = e.target.value.split('-');
        onPick(start, end);
      }}
    >
      {onDay.map((s) => (
        <MenuItem key={`${s.start_time}-${s.end_time}`} value={`${s.start_time}-${s.end_time}`}>
          {`${fmt.formatClock(s.start_time)} – ${fmt.formatClock(s.end_time)} · ${rupees(s.price)}`}
        </MenuItem>
      ))}
    </TextField>
  );
}
