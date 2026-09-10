import { Alert, FormControlLabel, Grid, MenuItem, Stack, Switch } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { Controller, type Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import type { VenueFormValues } from '../types';

/**
 * The venue's review state, its live switch and its money split.
 *
 * `venue_share_pct` and `venue_commission_pct` are the two figures settlement
 * reads at the end of a pod, so they are shown WITH the status rather than
 * buried: an approved venue whose commission was never set is settled on the
 * platform default, and the person approving it is the person who should know.
 *
 * Turning the live switch off emails the owner, which is why the warning says so
 * before it is flipped.
 */
type Translate = ReturnType<typeof useTranslation>['t'];

const statusOptions = (t: Translate) =>
  [
    { value: 'DRAFT', label: t('directory.venueEditor.statusDraft') },
    { value: 'SUBMITTED', label: t('directory.venueEditor.statusSubmitted') },
    { value: 'APPROVED', label: t('directory.venueEditor.statusApproved') },
    { value: 'REJECTED', label: t('directory.venueEditor.statusRejected') },
  ] as const;

export default function StatusSection({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={<VerifiedIcon color="primary" />}
      title={t('directory.venueEditor.statusAndMoney')}
    >
      <Stack spacing={1.5}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <RhfTextField
              control={control}
              name="status"
              label={t('directory.venueEditor.status')}
              size="small"
              select
            >
              {statusOptions(t).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RhfTextField>
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <RhfTextField
              control={control}
              name="venue_share_pct"
              label={t('directory.venueEditor.sharePct')}
              size="small"
              type="number"
              hint={t('directory.venueEditor.sharePctHint')}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <RhfTextField
              control={control}
              name="venue_commission_pct"
              label={t('directory.venueEditor.commissionPct')}
              size="small"
              type="number"
              hint={t('directory.venueEditor.commissionPctHint')}
            />
          </Grid>
        </Grid>

        <Controller
          control={control}
          name="is_active"
          render={({ field }) => (
            <Stack spacing={0.5}>
              <FormControlLabel
                control={<Switch checked={!!field.value} onChange={field.onChange} />}
                label={t('directory.venueEditor.isActive')}
              />
              {!field.value && (
                <Alert severity="warning" variant="outlined">
                  {t('directory.venueEditor.deactivateWarning')}
                </Alert>
              )}
            </Stack>
          )}
        />
      </Stack>
    </SectionCard>
  );
}
