import { Chip } from '@mui/material';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import type { PodSettlementStatus } from './queries';

const STATUS_META: Record<PodSettlementStatus, { label: string; color: 'info' | 'warning' | 'success' }> = {
  LIVE: { label: 'Live', color: 'info' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'warning' },
  SETTLED: { label: 'Settled', color: 'success' },
};

export default function SettlementStatusChip({ status }: Readonly<{ status: PodSettlementStatus }>) {
  const meta = STATUS_META[status] ?? { label: status, color: 'info' as const };
  return <Chip size="small" label={meta.label} color={meta.color} />;
}

/** Shown when the breakdown is rendered from the frozen completion snapshot. */
export function FrozenBadge() {
  return <Chip size="small" variant="outlined" icon={<AcUnitIcon />} label="Frozen snapshot" />;
}
