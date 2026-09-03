import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  POD_AUDIT_ACTION_COLORS,
  POD_AUDIT_RISK_COLORS,
  podAuditActionLabel,
  podAuditRiskLabel,
  podAuditSourceLabel,
  type PodAuditLog,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { ToneChip } from '../ToneChip';
import { useToneColors } from '../tone';

interface Props {
  log: PodAuditLog;
  /** `created_at`, already in the admin's date/time settings (rule 11). */
  when: string;
  testID: string;
  /** Opens the entry's detail sheet; omitted, the row is not tappable. */
  onPress?: () => void;
}

/** One entry of the AI-monitored trail: the pod, what happened, how risky the
 * monitor judged it, who did it and the one-line AI summary. */
export function AuditLogRow({ log, when, testID, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const tones = useToneColors();
  const actor = log.actor_name || t('clubAdmin.monitoring.unknownActor');
  const by = [actor, podAuditSourceLabel(log.source, t)].join(' · ');

  return (
    <YStack
      testID={testID}
      role={onPress ? 'button' : undefined}
      aria-label={onPress ? log.pod_title : undefined}
      onPress={onPress}
      pressStyle={onPress ? PRESS_STYLE.surface : undefined}
      gap={6}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
          {log.pod_title}
        </Text>
        <ToneChip
          testID={`${testID}-action`}
          label={podAuditActionLabel(log.action, t)}
          color={tones[POD_AUDIT_ACTION_COLORS[log.action]]}
        />
      </XStack>
      <XStack alignItems="center" gap={8} flexWrap="wrap">
        <ToneChip
          testID={`${testID}-risk`}
          label={t('clubAdmin.monitoring.aiRiskChip', {
            vars: { risk: podAuditRiskLabel(log.ai_risk, t) },
          })}
          color={tones[POD_AUDIT_RISK_COLORS[log.ai_risk]]}
        />
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {when}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted" numberOfLines={1}>
        {by}
      </Text>
      {log.ai_summary ? (
        <Text fontSize={12.5} color="$color" numberOfLines={2}>
          {log.ai_summary}
        </Text>
      ) : null}
    </YStack>
  );
}
