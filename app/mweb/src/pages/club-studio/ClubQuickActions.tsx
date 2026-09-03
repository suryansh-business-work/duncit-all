import { Link as RouterLink } from 'react-router';
import { Stack } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Club Studio's quick actions: the dashboard and the AI pod monitor — the
 * same two doors the drawer's Club Admin menu opens. Native twin (rule 27).
 */
export default function ClubQuickActions() {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} data-testid="club-quick-actions">
      <DuncitButton
        component={RouterLink}
        to="/clubs/dashboard"
        variant="outlined"
        startIcon={<SpaceDashboardIcon />}
        sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}
      >
        {t('mweb.clubStudio.dashboardAction')}
      </DuncitButton>
      <DuncitButton
        component={RouterLink}
        to="/clubs/monitoring"
        variant="outlined"
        startIcon={<MonitorHeartIcon />}
        sx={{ flex: 1, borderRadius: 999, fontWeight: 700 }}
      >
        {t('mweb.clubStudio.monitoringAction')}
      </DuncitButton>
    </Stack>
  );
}
