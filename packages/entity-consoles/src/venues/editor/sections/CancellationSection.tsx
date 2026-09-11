import { Divider, FormControlLabel, Grid, Stack, Switch, Typography } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { Controller, type Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import { ChargeTiersField, RefundTiersField } from '../fields/TierFields';
import type { VenueFormValues } from '../types';

/**
 * The venue's cancellation policy — both halves of it.
 *
 * The CHARGE bands are the venue's own terms for a late cancellation. The
 * TRIGGER and the REFUND ladder are Duncit's: how close to the start a
 * loss-making pod at this venue may still be auto-cancelled, and what its
 * attendees get back. They sit in one section because they are one conversation
 * with the venue, and they are labelled apart because they pay opposite ways.
 */
export default function CancellationSection({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={<EventBusyIcon color="primary" />}
      title={t('directory.venueEditor.cancellation')}
    >
      <Stack spacing={1.5}>
        <Controller
          control={control}
          name="settings.reschedule_only"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={!!field.value} onChange={field.onChange} />}
              label={t('directory.venueEditor.rescheduleOnly')}
            />
          )}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('directory.venueEditor.rescheduleOnlyHint')}
        </Typography>

        <ChargeTiersField control={control} />

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.autoCancel')}
        </Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="settings.trigger_hours"
              label={t('directory.venueEditor.triggerHours')}
              size="small"
              type="number"
              hint={t('directory.venueEditor.triggerHoursHint')}
            />
          </Grid>
        </Grid>
        <RefundTiersField control={control} />
      </Stack>
    </SectionCard>
  );
}
