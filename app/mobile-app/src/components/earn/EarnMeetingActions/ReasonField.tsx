import { MaterialIcons } from '@expo/vector-icons';
import { Text, TextArea, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}

/** Required free-text reason captured before a reschedule / cancel. The reason
 * is screened by AI Monitoring on submit, so the field says so up front. */
export function ReasonField({ testID, label, value, onChangeText }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  return (
    <YStack gap={6} paddingTop={12}>
      <Text fontSize={13} fontWeight="600" color="$color">
        {label} *
      </Text>
      <TextArea
        testID={testID}
        aria-label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('mweb.earn.addAShortReason')}
        placeholderTextColor="$muted"
        minHeight={70}
        maxLength={500}
        backgroundColor="$surface"
        borderColor="$borderColor"
      />
      <XStack testID={`${testID}-ai-monitoring`} alignItems="center" gap={4}>
        <MaterialIcons name="auto-awesome" size={12} color={muted} />
        <Text fontSize={11.5} color="$muted">
          AI Monitoring
        </Text>
      </XStack>
    </YStack>
  );
}
