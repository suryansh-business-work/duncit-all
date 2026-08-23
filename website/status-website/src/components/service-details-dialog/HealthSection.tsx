import { Box, LinearProgress, Skeleton, Stack, Typography } from '@mui/material';
import { DetailRow, StatusPill } from './DetailRow';
import { useTranslation } from '../../i18n';
import { formatBytes, formatDuration } from '../../utils/format';
import type { HealthReport } from '../../types';

interface HealthSectionProps {
  health: HealthReport | null;
  failed: boolean;
}

export default function HealthSection({ health, failed }: Readonly<HealthSectionProps>) {
  const { t } = useTranslation();
  if (failed) {
    return (
      <Typography variant="body2" color="text.secondary" py={1}>
        {t('status.detail.healthUnavailable')}
      </Typography>
    );
  }
  if (!health) return <Skeleton variant="rounded" height={120} />;

  const total = health.memory.systemTotalBytes;
  const used = total - health.memory.systemFreeBytes;
  const memPct = total > 0 ? Math.round((used / total) * 100) : 0;
  const dbOk = health.checks.database === 'connected';

  return (
    <Box>
      <DetailRow
        label={t('status.detail.status')}
        value={<StatusPill ok={health.status === 'ok'} label={health.status} />}
      />
      <DetailRow
        label={t('status.detail.database')}
        value={<StatusPill ok={dbOk} label={health.checks.database} />}
      />
      <DetailRow label={t('status.detail.version')} value={health.version} />
      <DetailRow label={t('status.detail.environment')} value={health.environment} />
      <DetailRow
        label={t('status.detail.processUptime')}
        value={formatDuration(health.uptime.processSeconds)}
      />
      <DetailRow
        label={t('status.detail.systemUptime')}
        value={formatDuration(health.uptime.systemSeconds)}
      />
      <DetailRow label={t('status.detail.node')} value={health.node} />
      <DetailRow label={t('status.detail.platform')} value={health.platform} />
      <DetailRow label={t('status.detail.hostname')} value={health.hostname} />
      <Box pt={1.5}>
        <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            {t('status.detail.memory')}
          </Typography>
          <Typography variant="body2">
            {formatBytes(used)} / {formatBytes(total)}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={memPct}
          color="success"
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
    </Box>
  );
}
