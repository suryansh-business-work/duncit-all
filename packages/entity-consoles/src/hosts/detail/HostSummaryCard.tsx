import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { HostDetail, HostStatus } from '../queries';

/**
 * The line an admin reads first: who this host is, where their application
 * stands, whether they are live, and what commission they are on.
 */
const STATUS_COLORS: Record<HostStatus, 'default' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

const EMPTY = '—';

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {value || EMPTY}
      </Typography>
    </Stack>
  );
}

export default function HostSummaryCard({ host }: Readonly<{ host: HostDetail }>) {
  const { t } = useTranslation();
  const statusLabel: Record<HostStatus, string> = {
    DRAFT: t('directory.hostEditor.statusDraft'),
    SUBMITTED: t('directory.hostEditor.statusSubmitted'),
    APPROVED: t('directory.hostEditor.statusApproved'),
    REJECTED: t('directory.hostEditor.statusRejected'),
  };

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          divider={<Divider flexItem orientation="vertical" />}
        >
          <Stack spacing={1} sx={{ minWidth: 200 }}>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color={STATUS_COLORS[host.status]}
                label={statusLabel[host.status]}
              />
              <Chip
                size="small"
                variant="outlined"
                color={host.is_active ? 'success' : 'default'}
                label={
                  host.is_active
                    ? t('directory.hostEditor.live')
                    : t('directory.hostEditor.paused')
                }
              />
            </Stack>
            <Fact label={t('directory.hostEditor.hostId')} value={host.host_no ?? ''} />
          </Stack>
          <Fact label={t('directory.hostEditor.colContact')} value={host.email} />
          <Fact label={t('directory.venueEditor.ownerPhone')} value={host.phone} />
          <Fact
            label={t('directory.hostEditor.colCommission')}
            value={
              host.host_commission_pct
                ? `${host.host_commission_pct}%`
                : t('directory.hostEditor.commissionDefault')
            }
          />
          <Fact
            label={t('directory.hostEditor.colApplied')}
            value={host.created_at ? formatDateTime(host.created_at) : ''}
          />
          <Fact
            label={t('directory.hostEditor.approvedAt')}
            value={host.approved_at ? formatDateTime(host.approved_at) : ''}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
