import { Avatar, Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { Translate } from '@duncit/shell';
import type { PodRow } from '../queries';
import { modeLabel, productLines } from '../podsColumns.values';

export const renderCover = (p: PodRow) => {
  const first = p.pod_images_and_videos?.[0];
  if (first?.type === 'VIDEO') {
    return (
      <Box
        component="video"
        src={first.url}
        muted
        playsInline
        preload="metadata"
        sx={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 1, display: 'block' }}
      />
    );
  }
  return (
    <Avatar variant="rounded" alt="" src={first?.url} sx={{ width: 32, height: 32 }}>
      {p.pod_title[0]}
    </Avatar>
  );
};

export const renderTitle = (p: PodRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{
      fontWeight: 600
    }}>
      {p.pod_title}
    </Typography>
    <Typography variant="caption" component="div" sx={{
      color: "text.secondary"
    }}>
      {p.pod_id}
    </Typography>
  </Box>
);

export const renderType = (p: PodRow) => (
  <Stack direction="row" spacing={0.5} component="span">
    <Chip size="small" label={modeLabel(p)} />
    <Chip
      size="small"
      label={p.pod_type.replaceAll('_', ' ')}
      color={p.pod_type.includes('FREE') ? 'default' : 'primary'}
    />
  </Stack>
);

export const renderHits = (p: PodRow) => (
  <Stack direction="row" spacing={0.5} component="span" sx={{
    alignItems: "center"
  }}>
    <VisibilityIcon fontSize="inherit" color="action" />
    <Typography variant="caption">{p.pod_hits}</Typography>
  </Stack>
);

export const renderStatus = (p: PodRow, t: Translate) => {
  if (p.is_deleted) return <Chip size="small" label={t('admin.eventTickets.cancelled')} color="error" />;
  if (p.completed_at) return <Chip size="small" label={t('admin.podsDashboard.completed')} color="info" />;
  // The row is already tinted red; the chip is what names the reason.
  if (p.cancellation_risk?.at_risk) {
    return <Chip size="small" label={t('admin.pods.cancellationRisk')} color="error" variant="filled" />;
  }
  if (p.venue_approval_status === 'PENDING') {
    return <Chip size="small" label={t('admin.podsDashboard.awaitingVenue')} color="warning" />;
  }
  if (p.venue_approval_status === 'DECLINED') {
    return <Chip size="small" label={t('admin.pods.venueRejected')} color="error" variant="outlined" />;
  }
  if (p.is_active) return <Chip size="small" label={t('admin.profile.active')} color="success" />;
  return <Chip size="small" label={t('admin.pods.draft')} color="default" />;
};

export const renderProducts = (p: PodRow) => {
  const items = p.product_requests ?? [];
  if (items.length === 0) return '—';
  return (
    <Tooltip title={productLines(p)}>
      <Typography variant="caption" component="span" sx={{
        fontWeight: 700
      }}>
        {items.length} product{items.length === 1 ? '' : 's'} · ₹{p.product_cost_total ?? 0}
      </Typography>
    </Tooltip>
  );
};
