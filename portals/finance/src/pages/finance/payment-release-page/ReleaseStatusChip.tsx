import { Chip } from '@mui/material';
import type { ReleaseKind } from './queries';

export function ReleaseKindChip({ kind }: Readonly<{ kind: ReleaseKind }>) {
  return <Chip size="small" label={kind === 'VENUE_BILLING' ? 'Venue Billing' : 'Host Payment'} color={kind === 'VENUE_BILLING' ? 'info' : 'secondary'} />;
}
