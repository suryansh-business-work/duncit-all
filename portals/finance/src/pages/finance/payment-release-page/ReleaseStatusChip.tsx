import { Chip } from '@mui/material';
import type { ReleaseKind } from './queries';

type KindChipColor = 'info' | 'secondary' | 'success' | 'warning';

const KIND_CHIPS: Record<ReleaseKind, { label: string; color: KindChipColor }> = {
  VENUE_BILLING: { label: 'Venue Billing', color: 'info' },
  HOST_PAYMENT: { label: 'Host Payment', color: 'secondary' },
  CLUB_ADMIN: { label: 'Club Admin', color: 'success' },
  ECOMM_PAYMENT: { label: 'E-Commerce Brand', color: 'warning' },
};

export function ReleaseKindChip({ kind }: Readonly<{ kind: ReleaseKind }>) {
  const chip = KIND_CHIPS[kind] ?? KIND_CHIPS.HOST_PAYMENT;
  return <Chip size="small" label={chip.label} color={chip.color} />;
}
