import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, SectionCard } from '@duncit/ui';
import ListBody from '../ListBody';
import AlertsTable from './AlertsTable';
import AlertDialog from './AlertDialog';
import { useAlertActions } from './useAlertActions';
import { ANALYTICS_ALERTS, type AnalyticsAlert } from './queries';

/** Which dialog is open: none, a new alert, or one being edited. */
type Editing = { alert: AnalyticsAlert | null } | null;

/**
 * Analytics > Settings > Alerts: a watch on any tile of any dashboard, checked
 * every hour. When one trips, the people on it are mailed (and Slack told, if
 * asked) with a link to the records behind the number; while it stays tripped
 * they hear once a day. The mail is `analytics-alert` in Tech > Email Templates.
 */
export default function AnalyticsAlertsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(ANALYTICS_ALERTS, { fetchPolicy: 'cache-and-network' });
  const { onCheck, onDelete, checkingId } = useAlertActions();
  const [editing, setEditing] = useState<Editing>(null);
  const rows = data?.analyticsAlerts;

  const add = (
    <DuncitButton
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => setEditing({ alert: null })}
      data-testid="analytics-alert-add"
    >
      {t('analytics.alerts.addAlert')}
    </DuncitButton>
  );

  return (
    <Stack spacing={3} data-testid="analytics-alerts-page">
      <PageHeader title={t('analytics.alerts.title')} subtitle={t('analytics.alerts.subtitle')} />
      <SectionCard title={t('analytics.alerts.listTitle')} subtitle={t('analytics.alerts.listHint')} action={add}>
        <Stack spacing={2}>
          <ListBody ready={Boolean(rows)} loading={loading} error={error} onRetry={() => refetch().catch(() => undefined)}>
            <AlertsTable
              rows={rows ?? []}
              onCheck={onCheck}
              onEdit={(alert) => setEditing({ alert })}
              onDelete={onDelete}
              checkingId={checkingId}
            />
          </ListBody>
        </Stack>
        {editing && <AlertDialog alert={editing.alert} onClose={() => setEditing(null)} />}
      </SectionCard>
    </Stack>
  );
}
