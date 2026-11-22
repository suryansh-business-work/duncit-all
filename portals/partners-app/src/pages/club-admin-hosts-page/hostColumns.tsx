import { Avatar, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { formatDate } from '@duncit/app-settings';
import { ContactChips } from '@duncit/pod-details';
import type { DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/shell';
import type { ClubHostRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Avatar + name, with an Inactive chip on the hosts who need a call. */
const renderHost = (host: ClubHostRow, t: Translate) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
    <Avatar src={host.photo_url ?? undefined} alt="" sx={{ width: 32, height: 32 }}>
      <PersonIcon fontSize="small" />
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap component="div" sx={{ fontWeight: 900 }}>
        {host.name}
      </Typography>
      {host.is_inactive && (
        <Chip size="small" color="warning" label={t('clubAdmin.hosts.inactiveChip')} data-testid={`club-host-inactive-${host.user_id}`} />
      )}
    </Box>
  </Stack>
);

/** The month's score as a bar the eye can scan down, with the percent beside it. */
const renderScore = (host: ClubHostRow, t: Translate) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
    <LinearProgress
      variant="determinate"
      value={host.score}
      color={host.score >= 100 ? 'success' : 'warning'}
      sx={{ flex: 1 }}
      aria-label={t('clubAdmin.hosts.scoreAria', { vars: { score: host.score } })}
    />
    <Typography variant="caption" sx={{ fontWeight: 700 }}>
      {t('clubAdmin.hosts.scorePercent', { vars: { score: host.score } })}
    </Typography>
  </Stack>
);

/**
 * Hosts table columns. Every value is computed per row by the server (contacts,
 * month, score), so only the plain ones sort; none filter on the client.
 */
export const clubHostColumns = (t: Translate): DuncitColumn<ClubHostRow>[] => [
  {
    field: 'name',
    headerName: t('clubAdmin.hosts.colHost'),
    flex: 1,
    minWidth: 200,
    type: 'text',
    cellRenderer: (host) => renderHost(host, t),
    valueGetter: (host) => host.name,
  },
  {
    field: 'contact',
    headerName: t('clubAdmin.hosts.colContact'),
    minWidth: 260,
    type: 'text',
    sortable: false,
    filterable: false,
    cellRenderer: (host) => <ContactChips contact={host} testId={`club-host-contact-${host.user_id}`} />,
    valueGetter: (host) => [host.phone, host.whatsapp, host.email].filter(Boolean).join(' '),
  },
  {
    field: 'last_pod_at',
    headerName: t('clubAdmin.hosts.colLastPod'),
    width: 150,
    type: 'text',
    filterable: false,
    valueGetter: (host) => formatDate(host.last_pod_at) || t('clubAdmin.hosts.noPodYet'),
  },
  {
    field: 'completed_this_month',
    headerName: t('clubAdmin.hosts.colThisMonth'),
    width: 130,
    // Shown as "done / target"; sorted server-side on the completed count.
    type: 'text',
    filterable: false,
    valueGetter: (host) =>
      t('clubAdmin.hosts.monthProgress', { vars: { done: host.completed_this_month, target: host.monthly_target } }),
  },
  {
    field: 'score',
    headerName: t('clubAdmin.hosts.colScore'),
    width: 170,
    type: 'number',
    filterable: false,
    cellRenderer: (host) => renderScore(host, t),
    valueGetter: (host) => host.score,
  },
  {
    field: 'upcoming_count',
    headerName: t('clubAdmin.hosts.colUpcoming'),
    width: 110,
    type: 'number',
    filterable: false,
    valueGetter: (host) => host.upcoming_count,
  },
  {
    field: 'engagement_status_label',
    headerName: t('clubAdmin.hosts.colStatus'),
    width: 170,
    type: 'text',
    filterable: false,
    cellRenderer: (host) => <Chip size="small" variant="outlined" label={host.engagement_status_label} />,
    valueGetter: (host) => host.engagement_status_label,
  },
];
