import { Chip } from '@mui/material';
import type { ReleaseKind } from './queries';

const KIND_CHIPS: Record<ReleaseKind, { label: string; color: 'info' | 'secondary' | 'success' }> = {
  VENUE_BILLING: { label: 'Venue Billing', color: 'info' },
  HOST_PAYMENT: { label: 'Host Payment', color: 'secondary' },
  CLUB_ADMIN: { label: 'Club Admin', color: 'success' },
};

export function ReleaseKindChip({ kind }: Readonly<{ kind: ReleaseKind }>) {
  const chip = KIND_CHIPS[kind] ?? KIND_CHIPS.HOST_PAYMENT;
  return <Chip size="small" label={chip.label} color={chip.color} />;
}
