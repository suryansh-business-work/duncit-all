import { useState } from 'react';
import { Alert, Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { parseIsoDay } from '@duncit/datetime';
import SlotList from '../../DayDrawer/SlotList';
import type { VenueSlotRow } from '../../types';
import { errorText } from '../format';
import type { BookingDay, VenuePricingData, VenuePricingInput } from '../types';
import { holidaysWith, overrideOn, pricingWithBlocked, pricingWithOverride } from './day-edits';
import { DayOverrideForm, dayOverrideValues } from './day-override';
import DayQuote from './DayQuote';
import DayStatus from './DayStatus';
import DayToggles from './DayToggles';

interface Props {
  venueId: string;
  /** 'yyyy-MM-dd'; null = closed. */
  ymd: string | null;
  day: BookingDay | undefined;
  pricing: VenuePricingData;
  holidays: string[];
  /** The venue's existing slot rows that day (booked, blocked, old availability) — never lost. */
  slots: VenueSlotRow[];
  onClose: () => void;
  savePricing: (input: VenuePricingInput) => Promise<void>;
  saveHolidays: (holidays: string[]) => Promise<void>;
  onToggleSlotBlock: (slot: VenueSlotRow) => Promise<void>;
  onDeleteSlot: (slotId: string) => Promise<void>;
}

/** One date of the Venue Pricing Module: its price change, block, holiday, slots and bookings. */
export default function PricingDayDrawer(props: Readonly<Props>) {
  const { venueId, ymd, day, pricing, holidays, slots, onClose } = props;
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (write: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await write();
    } catch (e) {
      setError(errorText(e, t('venuePricing.day.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const override = ymd ? overrideOn(pricing, ymd) : null;
  const date = ymd ? parseIsoDay(ymd) : null;

  return (
    <Drawer anchor="right" open={!!ymd} onClose={onClose} data-testid="pricing-day-drawer" slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 } } } }}>
      {ymd && (
        <Stack spacing={2} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
                {t('venuePricing.day.title')}
              </Typography>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 900 }}>
                {date ? fmt.formatDate(date) : ymd}
              </Typography>
            </Box>
            <DuncitIconButton size="small" onClick={onClose} aria-label={t('venuePricing.day.close')}>
              <CloseIcon />
            </DuncitIconButton>
          </Stack>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <DayStatus day={day} model={pricing.model} />
          <DayQuote venueId={venueId} ymd={ymd} day={day} pricing={pricing} />
          <Divider />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('venuePricing.day.overrideTitle')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('venuePricing.day.overrideHint')}
          </Typography>
          <DayOverrideForm
            key={`${ymd}-${override?.mode ?? ''}-${override?.value ?? ''}`}
            defaultValues={dayOverrideValues(override)}
            hasOverride={!!override}
            busy={busy}
            onSave={(values) => run(() => props.savePricing(pricingWithOverride(pricing, ymd, values)))}
            onClear={() => run(() => props.savePricing(pricingWithOverride(pricing, ymd, null)))}
          />
          <Divider />
          <DayToggles
            blocked={pricing.blocked_dates.includes(ymd)}
            holiday={holidays.includes(ymd)}
            busy={busy}
            hasBookings={(day?.busy.length ?? 0) > 0}
            onBlocked={(next) => run(() => props.savePricing(pricingWithBlocked(pricing, ymd, next)))}
            onHoliday={(next) => run(() => props.saveHolidays(holidaysWith(holidays, ymd, next)))}
          />
          {slots.length > 0 && (
            <>
              <Divider />
              <SlotList slots={slots} onToggleBlock={props.onToggleSlotBlock} onDelete={props.onDeleteSlot} />
            </>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
