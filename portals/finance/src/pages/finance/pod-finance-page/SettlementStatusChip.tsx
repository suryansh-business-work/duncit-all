import { Chip } from '@mui/material';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import type { PodSettlementStatus } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

const statusMeta = (t: Translate): Record<PodSettlementStatus, { label: string; color: 'info' | 'warning' | 'success' }> => ({
  LIVE: { label: t('finance.podFinance.live'), color: 'info' },
  PENDING_APPROVAL: { label: t('finance.podFinance.pendingApproval'), color: 'warning' },
  SETTLED: { label: t('finance.podFinance.settled'), color: 'success' },
});

export default function SettlementStatusChip({ status }: Readonly<{ status: PodSettlementStatus }>) {
  const { t } = useTranslation();
  const meta = statusMeta(t)[status] ?? { label: status, color: 'info' as const };
  return <Chip size="small" label={meta.label} color={meta.color} />;
}

/** Shown when the breakdown is rendered from the frozen completion snapshot. */
export function FrozenBadge() {
  const { t } = useTranslation();
  return <Chip size="small" variant="outlined" icon={<AcUnitIcon />} label={t('finance.podFinance.frozenSnapshot')} />;
}
