import { useQuery } from '@apollo/client/react';
import { Alert, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SectionCard, usePodDetailsTranslation } from '@duncit/pod-details';
import { formatDateTime } from '@duncit/app-settings';
import { POD_CANCELLATION_RISK, type PodCancellationRiskView } from './queries';
import { AlertsLine, AttendeesPanel, FinancePanel, FixList } from './RiskPanels';

interface Props {
  podId: string;
  /** A cancelled pod has nothing left to be at risk of; the query is skipped. */
  cancelled: boolean;
}

/**
 * The cancellation-risk report at the top of the admin pod page.
 *
 * Rendered ONLY while the pod is at risk — a healthy pod's page is unchanged.
 * It says, in this order: what will happen and when; why the money does not
 * add up (the same waterfall the Finance card shows, ending below zero); what
 * the seats would have to do to fix it; the ways out; and who has been told.
 * The sweep that cancels reads the same assessment, so this page and the
 * cancellation can never disagree.
 */
export default function PodCancellationRiskSection({ podId, cancelled }: Readonly<Props>) {
  const { t } = usePodDetailsTranslation();
  const { data, loading, error } = useQuery<{ podCancellationRisk: PodCancellationRiskView }>(
    POD_CANCELLATION_RISK,
    { variables: { id: podId }, skip: !podId || cancelled, fetchPolicy: 'cache-and-network' }
  );
  const risk = data?.podCancellationRisk;

  if (error) return <Alert severity="warning">{t('admin.podRisk.loadFailed')}</Alert>;
  if (!risk?.at_risk) return null;

  const cancelAt = risk.cancel_at ? formatDateTime(risk.cancel_at) : '—';
  return (
    <SectionCard
      icon={<WarningAmberIcon fontSize="small" />}
      title={t('admin.podRisk.title')}
      tone="warning"
      loading={loading}
      action={<Chip size="small" color="error" label={t('admin.pods.cancellationRisk')} />}
      sx={{ borderColor: 'error.main', borderWidth: 2 }}
    >
      <Stack spacing={2}>
        <Alert severity="error" variant="outlined">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('admin.podRisk.lead', { vars: { cancelAt } })}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('admin.podRisk.hoursLeft', {
              vars: { hours: Math.round(risk.hours_until_start), lead: risk.lead_hours },
            })}
          </Typography>
        </Alert>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FinancePanel risk={risk} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AttendeesPanel risk={risk} />
          </Grid>
        </Grid>
        <Divider />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FixList risk={risk} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AlertsLine risk={risk} />
          </Grid>
        </Grid>
      </Stack>
    </SectionCard>
  );
}
