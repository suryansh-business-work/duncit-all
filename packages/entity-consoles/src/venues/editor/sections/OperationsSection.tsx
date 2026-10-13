import { Divider, FormControlLabel, Grid, Stack, Switch, Typography } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { Controller, type Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import ChipMultiSelect from '../fields/ChipMultiSelect';
import RhfDateField from '../fields/RhfDateField';
import WeeklyOffField from '../fields/WeeklyOffField';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * How the venue operates: its window, its weekly closures and its booking
 * rules — the first of the staff-only sections, after the eight the owner's
 * registration form has. (The closed DATES are `LeavesSection`, where the
 * owner's form keeps them.) The internal search tags sit at the foot: they are
 * staff's own, and an owner never sees them.
 *
 * The same values the owner edits in the Partners console, written through the
 * same `updateVenueSettings` mutation — so an admin sees exactly what the owner
 * sees, and the two can never disagree about what a venue's rules are.
 *
 * Every label is a LITERAL `t('…')` inside its own row rather than a key built
 * from a loop variable: the localization gate reads the source, and a composed
 * key is invisible to it (rule 38).
 */
type Translate = ReturnType<typeof useTranslation>['t'];

const ruleFields = (t: Translate) =>
  [
    { name: 'settings.rules.buffer_minutes', label: t('directory.venueEditor.bufferMinutes') },
    { name: 'settings.rules.min_notice_minutes', label: t('directory.venueEditor.minNotice') },
    { name: 'settings.rules.max_advance_days', label: t('directory.venueEditor.maxAdvance') },
    { name: 'settings.rules.max_bookings_per_slot', label: t('directory.venueEditor.maxPerSlot') },
  ] as const;

const ruleSwitches = (t: Translate) =>
  [
    {
      name: 'settings.rules.allow_instant_booking',
      label: t('directory.venueEditor.instantBooking'),
    },
    { name: 'settings.rules.allow_waitlist', label: t('directory.venueEditor.waitlist') },
    {
      name: 'settings.rules.booking_approval_required',
      label: t('directory.venueEditor.approvalRequired'),
    },
    {
      name: 'settings.rules.allow_multiple_bookings',
      label: t('directory.venueEditor.multipleBookings'),
    },
  ] as const;

export default function OperationsSection({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      id={sectionAnchor('operations')}
      icon={<ScheduleIcon color="primary" />}
      title={t('directory.venueEditor.operations')}
    >
      <Stack spacing={1.5}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, md: 3 }}>
            <RhfTextField
              control={control}
              name="settings.open"
              label={t('directory.venueEditor.opensAt')}
              size="small"
              hint={t('directory.venueEditor.clockHint')}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <RhfTextField
              control={control}
              name="settings.close"
              label={t('directory.venueEditor.closesAt')}
              size="small"
              hint={t('directory.venueEditor.clockHint')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <WeeklyOffField control={control} />
          </Grid>
        </Grid>

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.bookingRules')}
        </Typography>
        <Grid container spacing={1.5}>
          {ruleFields(t).map((rule) => (
            <Grid size={{ xs: 6, md: 3 }} key={rule.name}>
              <RhfTextField
                control={control}
                name={rule.name}
                label={rule.label}
                size="small"
                type="number"
              />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={0.5}>
          {ruleSwitches(t).map((rule) => (
            <Grid size={{ xs: 12, md: 6 }} key={rule.name}>
              <Controller
                control={control}
                name={rule.name}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={field.onChange} />}
                    label={rule.label}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.autoExtend')}
        </Typography>
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Controller
              control={control}
              name="settings.auto_extend_enabled"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={field.onChange} />}
                  label={t('directory.venueEditor.autoExtendEnabled')}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <RhfTextField
              control={control}
              name="settings.auto_extend_horizon_days"
              label={t('directory.venueEditor.autoExtendHorizon')}
              size="small"
              type="number"
              hint={t('directory.venueEditor.autoExtendHorizonHint')}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <RhfDateField
              control={control}
              name="settings.auto_extend_until"
              label={t('directory.venueEditor.autoExtendUntil')}
              hint={t('directory.venueEditor.autoExtendUntilHint')}
            />
          </Grid>
        </Grid>

        <Divider />
        <ChipMultiSelect
          control={control}
          name="tags"
          label={t('directory.venueEditor.tags')}
          options={[]}
          freeSolo
          hint={t('directory.venueEditor.tagsHint')}
        />
      </Stack>
    </SectionCard>
  );
}
