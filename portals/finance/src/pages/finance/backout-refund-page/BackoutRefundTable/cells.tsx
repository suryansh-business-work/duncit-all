import { Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import {
  BACKOUT_STATUS_COLORS,
  BACKOUT_STATUS_LABELS,
  REFUND_STATUS_COLORS,
  type BackoutRefundRequest,
} from '../queries';

export const BACKOUT_STATUS_OPTIONS = (['IN_PROCESS', 'CANCELLED', 'SPOT_FILLED'] as const).map((s) => ({
  value: s,
  label: BACKOUT_STATUS_LABELS[s],
}));

export const getBackoutRowId = (row: BackoutRefundRequest) => row.id;

export const renderBackoutNo = (row: BackoutRefundRequest) => (
  <Typography
    variant="body2"
    component="span"
    sx={{
      fontWeight: 800,
      fontFamily: 'monospace',
      whiteSpace: 'nowrap'
    }}>
    {row.backout_no}
  </Typography>
);

export const renderMember = (row: BackoutRefundRequest) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{
      fontWeight: 700
    }}>
      {row.user_name ?? '—'}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {row.user_email ?? ''}
    </Typography>
  </Stack>
);

export const renderBackoutStatus = (row: BackoutRefundRequest) => (
  <StatusChip
    status={row.backout_status}
    label={BACKOUT_STATUS_LABELS[row.backout_status]}
    colorMap={BACKOUT_STATUS_COLORS}
  />
);

export const renderRefundStatus = (row: BackoutRefundRequest) => (
  <StatusChip status={row.refund_status} colorMap={REFUND_STATUS_COLORS} />
);
