import { Chip } from '@mui/material';
import type { ReleaseKind, ReleaseStatus } from './queries';

export function ReleaseKindChip({ kind }: { kind: ReleaseKind }) {
  return <Chip size="small" label={kind === 'VENUE_BILLING' ? 'Venue Billing' : 'Host Payment'} color={kind === 'VENUE_BILLING' ? 'info' : 'secondary'} />;
}

export default function ReleaseStatusChip({ status }: { status: ReleaseStatus }) {
  const color = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'warning';
  return <Chip size="small" label={status} color={color} />;
}