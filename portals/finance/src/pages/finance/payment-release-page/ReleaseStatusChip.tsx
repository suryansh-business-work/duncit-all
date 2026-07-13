import { Chip } from '@mui/material';
import type { ReleaseKind, ReleaseStatus } from './queries';

export function ReleaseKindChip({ kind }: Readonly<{ kind: ReleaseKind }>) {
  return <Chip size="small" label={kind === 'VENUE_BILLING' ? 'Venue Billing' : 'Host Payment'} color={kind === 'VENUE_BILLING' ? 'info' : 'secondary'} />;
}

type StatusColor = 'success' | 'error' | 'warning';

function statusColor(status: ReleaseStatus): StatusColor {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  return 'warning';
}

export default function ReleaseStatusChip({ status }: Readonly<{ status: ReleaseStatus }>) {
  return <Chip size="small" label={status} color={statusColor(status)} />;
}