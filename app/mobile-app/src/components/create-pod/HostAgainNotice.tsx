import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { hostAgainNoticeKeys } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  sourceTitle: string;
  /** Codes from `hostAgainPrefill` — what could not be carried over. */
  notices: readonly string[];
  /** The pod's city when it is not the header's — said so the host is not surprised. */
  otherCityName: string | null;
}

/**
 * Above a Host Again form: where it was copied from, a pod city other than the
 * header's, and anything that could not be carried over (each naming the step
 * to fix it on). mWeb twin: create-pod-page/HostAgainNotice (rule 27).
 */
export function HostAgainNotice({ sourceTitle, notices, otherCityName }: Readonly<Props>) {
  const { color } = useThemeColors();
  const { t } = useTranslation();
  const warnings = hostAgainNoticeKeys(notices);
  return (
    <YStack gap={8} testID="create-pod-host-again">
      <XStack
        testID="create-pod-host-again-source"
        role="status"
        aria-live="polite"
        gap={8}
        alignItems="flex-start"
        backgroundColor="$soft"
        borderRadius={14}
        padding={12}
      >
        <MaterialIcons name="content-copy" size={16} color={color} />
        <YStack flex={1} gap={4}>
          <Text fontSize={13} color="$color">
            {t('mweb.createPod.hostAgain.copiedFrom', { vars: { title: sourceTitle } })}
          </Text>
          {otherCityName ? (
            <Text testID="create-pod-host-again-city" fontSize={13} color="$color">
              {t('mweb.createPod.hostAgain.otherCity', { vars: { city: otherCityName } })}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      {warnings.map((key) => (
        <Text
          key={key}
          testID={`create-pod-host-again-warning-${key}`}
          fontSize={13}
          color="$warning"
        >
          {t(key)}
        </Text>
      ))}
    </YStack>
  );
}
