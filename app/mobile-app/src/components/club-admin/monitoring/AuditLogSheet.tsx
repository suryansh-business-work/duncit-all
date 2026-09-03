import { Text, XStack, YStack } from 'tamagui';
import {
  POD_AUDIT_RISK_COLORS,
  podAuditActionLabel,
  podAuditRiskLabel,
  podAuditSourceLabel,
  type PodAuditLog,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { ToneChip } from '../ToneChip';
import { useToneColors } from '../tone';
import { AuditLogChanges } from './AuditLogChanges';

/** One labelled line of the entry's facts. */
function DetailLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between" gap={12} paddingVertical={2}>
      <Text fontSize={12.5} color="$muted">
        {label}
      </Text>
      <Text flex={1} fontSize={13} fontWeight="600" color="$color" textAlign="right">
        {value}
      </Text>
    </XStack>
  );
}

interface Props {
  log: PodAuditLog | null;
  /** `created_at`, already formatted by the caller (rule 11). */
  when: string;
  onClose: () => void;
}

/** The full entry behind a monitoring row — the Tamagui twin of the detail
 * dialog the Partners console opens from the same table (rule 27). */
export function AuditLogSheet({ log, when, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const tones = useToneColors();
  const closeLabel = t('mweb.common.close');
  const actor = log?.actor_name || t('clubAdmin.monitoring.unknownActor');

  const footer = (
    <DuncitButton
      testID="club-monitoring-detail-close"
      label={closeLabel}
      onPress={onClose}
      variant="outline"
      tone="neutral"
      fullWidth
    />
  );

  return (
    <DuncitDialog
      open={!!log}
      onClose={onClose}
      testID="club-monitoring-detail"
      title={log?.pod_title ?? ''}
      subtitle={log ? podAuditActionLabel(log.action, t) : undefined}
      closeLabel={closeLabel}
      footer={footer}
    >
      {log ? (
        <YStack gap={10}>
          <DetailLine label={t('clubAdmin.monitoring.when')} value={when} />
          <DetailLine
            label={t('clubAdmin.monitoring.actor')}
            value={[actor, podAuditSourceLabel(log.source, t)].join(' · ')}
          />
          <XStack alignItems="center" justifyContent="space-between" gap={12}>
            <Text fontSize={12.5} color="$muted">
              {t('clubAdmin.monitoring.aiRisk')}
            </Text>
            <ToneChip
              testID="club-monitoring-detail-risk"
              label={podAuditRiskLabel(log.ai_risk, t)}
              color={tones[POD_AUDIT_RISK_COLORS[log.ai_risk]]}
            />
          </XStack>
          {log.ai_summary ? (
            <YStack gap={2}>
              <Text fontSize={12.5} color="$muted">
                {t('clubAdmin.monitoring.aiSummary')}
              </Text>
              <Text testID="club-monitoring-detail-summary" fontSize={13} color="$color">
                {log.ai_summary}
              </Text>
            </YStack>
          ) : null}
          <AuditLogChanges log={log} testID="club-monitoring-detail-changes" />
        </YStack>
      ) : null}
    </DuncitDialog>
  );
}
