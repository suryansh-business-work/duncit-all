import { StatusChip } from '@duncit/ui';
import {
  POD_AUDIT_ACTION_COLORS,
  POD_AUDIT_RISK_COLORS,
  podAuditActionLabel,
  podAuditRiskLabel,
  type PodAuditAction,
  type PodAuditRisk,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/** The action an entry records, in the tone `@duncit/utils` assigns it. */
export function AuditActionChip({ action }: Readonly<{ action: PodAuditAction }>) {
  const { t } = useTranslation();
  return (
    <StatusChip
      status={action}
      label={podAuditActionLabel(action, t)}
      colorMap={POD_AUDIT_ACTION_COLORS}
    />
  );
}

interface RiskProps {
  risk: PodAuditRisk;
  /** Prefix the verdict with "AI risk:" — the detail dialog, where the chip
   * stands alone rather than beside a column heading. */
  verbose?: boolean;
}

/** The monitor's risk verdict on an entry. */
export function AuditRiskChip({ risk, verbose = false }: Readonly<RiskProps>) {
  const { t } = useTranslation();
  const label = podAuditRiskLabel(risk, t);
  const text = verbose ? t('clubAdmin.monitoring.aiRiskChip', { vars: { risk: label } }) : label;
  return (
    <StatusChip status={risk} label={text} colorMap={POD_AUDIT_RISK_COLORS} variant="outlined" />
  );
}
