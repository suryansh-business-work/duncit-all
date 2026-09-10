import { Grid } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import StatusFields from '../../../shared/StatusFields';
import { lifecycleOptions } from '../../../shared/lifecycleOptions';
import type { VenueFormValues } from '../types';

/**
 * The venue's review state, its live switch and its money split.
 *
 * `venue_share_pct` and `venue_commission_pct` are the two figures settlement
 * reads at the end of a pod, so they are shown WITH the status rather than
 * buried: an approved venue whose commission was never set is settled on the
 * platform default, and the person approving it is the person who should know.
 */
export default function StatusSection({
  control,
  canGovern,
}: Readonly<{ control: Control<VenueFormValues>; canGovern: boolean }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      icon={<VerifiedIcon color="primary" />}
      title={t('directory.venueEditor.statusAndMoney')}
    >
      <StatusFields
        control={control}
        statusName="status"
        activeName="is_active"
        statusLabel={t('directory.venueEditor.status')}
        options={lifecycleOptions(t)}
        activeLabel={t('directory.venueEditor.isActive')}
        deactivateWarning={t('directory.venueEditor.deactivateWarning')}
        canGovern={canGovern}
        governedByNote={t('directory.venueEditor.governedBy')}
        extraFields={
          <>
            <Grid size={{ xs: 6, md: 4 }}>
              <RhfTextField
                control={control}
                name="venue_share_pct"
                label={t('directory.venueEditor.sharePct')}
                size="small"
                type="number"
                disabled={!canGovern}
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
                disabled={!canGovern}
                hint={t('directory.venueEditor.commissionPctHint')}
              />
            </Grid>
          </>
        }
      />
    </SectionCard>
  );
}
