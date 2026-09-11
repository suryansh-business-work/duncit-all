import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { usePodClubAdminHelp, type PodHelpSide } from '@/hooks/usePodClubAdminHelp';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * "Ask for help" — messages every admin of the pod's club by email and
 * WhatsApp with the pod attached, then says how it went. The button stays for a
 * failed request so it can be retried, and goes once there is nothing left to
 * press. mWeb twin: AskClubAdminHelp (rule 27).
 */
export function AskClubAdminHelp({
  podId,
  side,
  label,
}: Readonly<{ podId: string; side: PodHelpSide; label: string }>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const { ask, loading, outcome } = usePodClubAdminHelp(podId, side);
  const canAsk = !outcome || outcome.retry;

  return (
    <YStack gap={8} testID="ask-club-admin-help">
      {outcome ? (
        <Text testID="ask-club-admin-help-outcome" fontSize={12.5} color={outcome.color}>
          {t(outcome.key)}
        </Text>
      ) : null}
      {canAsk ? (
        <DuncitButton
          testID="ask-club-admin-help-button"
          label={loading ? t('mweb.podClubAdmin.askHelpSending') : label}
          onPress={ask}
          variant="outline"
          loading={loading}
          fullWidth
          icon={<MaterialIcons name="notifications-active" size={18} color={primary} />}
        />
      ) : null}
    </YStack>
  );
}
