import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AI_MONITOR_GRADIENT } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  onPress: () => void;
  testID?: string;
}

/** Colourful gradient pill that sits beside every step's title. Tapping it opens
 * the "What AI monitors" guidelines dialog. */
export function AiMonitorChip({ onPress, testID = 'create-pod-ai-chip' }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={t('mweb.createPod.aiMonitors')}
      onPress={onPress}
      pressStyle={{ opacity: 0.85 }}
      borderRadius={999}
      overflow="hidden"
    >
      <LinearGradient
        colors={AI_MONITOR_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <MaterialIcons name="auto-awesome" size={13} color="#ffffff" />
        <Text fontSize={11} fontWeight="700" color="#ffffff">
          {t('mweb.createPod.aiMonitoring')}
        </Text>
      </LinearGradient>
    </XStack>
  );
}
