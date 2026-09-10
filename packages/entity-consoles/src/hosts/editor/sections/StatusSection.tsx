import { Divider, Grid, Stack, Typography } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../../venues/detail/SectionCard';
import PayoutFields from '../../../shared/PayoutFields';
import StatusFields from '../../../shared/StatusFields';
import { lifecycleOptions } from '../../../shared/lifecycleOptions';
import type { HostFormValues } from '../types';

/**
 * The host's review state, their live switch, their commission and their payout.
 *
 * The commission sits beside the status because it is the figure settlement
 * reads at the end of a pod, and the person changing a host's status is the
 * person who should see it. 0 inherits the platform default — it is not "no
 * commission".
 */
export default function StatusSection({
  control,
}: Readonly<{ control: Control<HostFormValues> }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={<VerifiedIcon color="primary" />}
      title={t('directory.hostEditor.statusAndMoney')}
    >
      <Stack spacing={1.5}>
        <StatusFields
          control={control}
          statusName="status"
          activeName="is_active"
          statusLabel={t('directory.venueEditor.status')}
          options={lifecycleOptions(t)}
          activeLabel={t('directory.hostEditor.isActive')}
          deactivateWarning={t('directory.hostEditor.deactivateWarning')}
          extraFields={
            <Grid size={{ xs: 12, md: 4 }}>
              <RhfTextField
                control={control}
                name="host_commission_pct"
                label={t('directory.hostEditor.colCommission')}
                size="small"
                type="number"
                hint={t('directory.hostEditor.commissionHint')}
              />
            </Grid>
          }
        />

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.payout')}
        </Typography>
        <PayoutFields control={control} prefix="bank_account" />
      </Stack>
    </SectionCard>
  );
}
