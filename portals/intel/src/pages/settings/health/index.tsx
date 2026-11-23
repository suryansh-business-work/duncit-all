import type { ReactElement } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Button, List, ListItem, ListItemIcon, ListItemText, Skeleton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import { INTEL_HEALTH, type HealthData } from '../../../graphql/admin';

type Level = 'ok' | 'warn' | 'error';
const ICON: Record<Level, ReactElement> = {
  ok: <CheckCircleIcon color="success" />,
  warn: <WarningIcon color="warning" />,
  error: <ErrorIcon color="error" />,
};

/** Settings › System Health: every dependency Intel needs, checked live. */
export default function HealthSection() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<HealthData>(INTEL_HEALTH, { fetchPolicy: 'network-only', pollInterval: 30_000 });
  const h = data?.intelHealth;
  const checks: Array<{ level: Level; label: string; detail: string }> = h
    ? [
        { level: h.qdrant_reachable ? 'ok' : 'error', label: t('intel.settings.health.qdrant'), detail: h.qdrant_reachable ? t('intel.settings.health.up') : t('intel.settings.health.down') },
        { level: h.collections.some((c) => c.dimension_mismatch) ? 'warn' : 'ok', label: t('intel.settings.health.collections'), detail: t('intel.settings.health.collectionsDetail', { vars: { count: h.collections.filter((c) => c.exists).length } }) },
        { level: h.queue_configured ? 'ok' : 'warn', label: t('intel.settings.health.queue'), detail: h.queue_configured ? t('intel.settings.health.queueOn') : t('intel.settings.health.queueOff') },
        { level: h.openai_configured ? 'ok' : 'error', label: t('intel.settings.health.openai'), detail: h.openai_configured ? t('intel.settings.health.up') : t('intel.settings.health.openaiMissing') },
        { level: h.failed_runs_24h > 0 ? 'warn' : 'ok', label: t('intel.settings.health.failedRuns'), detail: String(h.failed_runs_24h) },
        { level: h.pending_approvals > 0 ? 'warn' : 'ok', label: t('intel.settings.health.pendingApprovals'), detail: String(h.pending_approvals) },
        ...h.connector_errors.map((c) => ({ level: 'error' as const, label: `${c.name} (${c.kind})`, detail: c.error })),
      ]
    : [];
  return (
    <SectionCard title={t('intel.settings.sections.health')} subtitle={t('intel.settings.health.subtitle')}>
      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch().catch(() => undefined)}>{t('intel.common.retry')}</Button>}>{t('intel.settings.health.loadFailed')}</Alert>}
      {loading && !h && <Skeleton variant="rounded" height={200} />}
      <List dense aria-label={t('intel.settings.sections.health')}>
        {checks.map((c) => (
          <ListItem key={c.label}>
            <ListItemIcon sx={{ minWidth: 36 }}>{ICON[c.level]}</ListItemIcon>
            <ListItemText primary={c.label} secondary={c.detail} slotProps={{ secondary: { sx: { wordBreak: 'break-word' } } }} />
          </ListItem>
        ))}
      </List>
    </SectionCard>
  );
}
