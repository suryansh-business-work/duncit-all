import { Alert, Stack, Typography } from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { NearbyScan } from '../../hooks/useNearbyLeads';
import RadarScan from './RadarScan';

interface Props {
  scan: NearbyScan;
  radiusKm: number;
  onChangeSearch: () => void;
  onViewLeads: () => void;
}

/** The dialog while a nearby search runs (radar) and once it answers (count, or what went wrong). */
export default function NearbyScanView({ scan, radiusKm, onChangeSearch, onViewLeads }: Readonly<Props>) {
  const { t } = useTranslation();
  const km = radiusKm;

  if (scan.phase === 'error') {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{scan.message}</Alert>
        <DuncitButton variant="outlined" onClick={onChangeSearch} data-testid="nearby-change">
          {t('crm.nearby.changeSearch')}
        </DuncitButton>
      </Stack>
    );
  }

  if (scan.phase !== 'done') {
    const label = scan.phase === 'locating' ? t('crm.nearby.locating') : t('crm.nearby.scanning', { vars: { km } });
    return <RadarScan label={label} />;
  }

  let found = t('crm.nearby.none', { vars: { km } });
  if (scan.total === 1) found = t('crm.nearby.foundOne', { vars: { km } });
  else if (scan.total > 1) found = t('crm.nearby.foundMany', { vars: { count: scan.total, km } });

  return (
    <Stack spacing={2} sx={{ alignItems: 'stretch' }}>
      <Stack spacing={1} sx={{ alignItems: 'center', py: 1 }}>
        <TravelExploreIcon color={scan.total > 0 ? 'primary' : 'disabled'} fontSize="large" aria-hidden />
        <Typography role="status" aria-live="polite" variant="h6" sx={{ textAlign: 'center' }} data-testid="nearby-result">
          {found}
        </Typography>
      </Stack>
      {!!scan.unplaced && (
        <Alert severity="info" data-testid="nearby-unplaced">
          {t('crm.nearby.unplaced', { vars: { count: scan.unplaced } })}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton variant="outlined" onClick={onChangeSearch} data-testid="nearby-change">
          {t('crm.nearby.changeSearch')}
        </DuncitButton>
        {scan.total > 0 && (
          <DuncitButton variant="contained" onClick={onViewLeads} data-testid="nearby-view">
            {t('crm.nearby.viewLeads')}
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
