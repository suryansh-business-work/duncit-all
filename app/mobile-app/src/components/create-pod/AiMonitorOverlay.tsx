import { Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, YStack } from 'tamagui';

import { AiMonitorGlyph, useAiMonitorLoop } from '@/components/ai-monitoring';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useTranslation } from '@/hooks/useTranslation';
import { AI_MONITOR_GRADIENT, AI_MONITOR_MOTION } from '@duncit/utils';

const TRACK_WIDTH = 236;
const BAR_WIDTH = 90;

/**
 * The overlay a host waits behind from the moment they press Create Pod until
 * the AI content check answers.
 *
 * On a `Modal` rather than an absolutely-positioned box: the stepper renders
 * inside the screen's ScrollView, so an in-tree overlay would cover the form
 * and nothing else — and the form is exactly what must stop being editable
 * while the pod is read and published. mWeb twin — `AiMonitorBackdrop`, over
 * `@duncit/ai-monitoring/mui`'s `AiProcessingOverlay`; the breathing badge and
 * its rings are `AiMonitorGlyph` on both sides, on the same timings (rule 27).
 */
export function AiMonitorOverlay({ open }: Readonly<{ open: boolean }>) {
  const { t } = useTranslation();
  const scan = useAiMonitorLoop(open, AI_MONITOR_MOTION.scanMs);
  const barStyle = {
    transform: [
      {
        translateX: scan.interpolate({
          inputRange: [0, 1],
          outputRange: [-BAR_WIDTH, TRACK_WIDTH],
        }),
      },
    ],
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => undefined}>
      <ModalThemeScope>
        <YStack
          testID="create-pod-ai-monitor"
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding={24}
          backgroundColor="rgba(3,7,18,0.74)"
        >
          <YStack
            width={300}
            maxWidth="100%"
            alignItems="center"
            gap={12}
            paddingVertical={28}
            paddingHorizontal={24}
            borderRadius={20}
            backgroundColor="rgba(17,24,39,0.94)"
            borderWidth={1}
            borderColor="rgba(255,255,255,0.16)"
          >
            <AiMonitorGlyph size={56} rings />
            <Text fontSize={16} fontWeight="700" color="#ffffff" textAlign="center">
              {t('mweb.createPod.aiMonitoringTitle')}
            </Text>
            <YStack
              width={TRACK_WIDTH}
              maxWidth="100%"
              height={4}
              borderRadius={999}
              overflow="hidden"
              backgroundColor="rgba(255,255,255,0.14)"
            >
              <Animated.View style={[{ width: BAR_WIDTH, height: 4, borderRadius: 999 }, barStyle]}>
                <LinearGradient
                  colors={AI_MONITOR_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1, borderRadius: 999 }}
                />
              </Animated.View>
            </YStack>
            <Text fontSize={13} color="rgba(255,255,255,0.9)" textAlign="center">
              {t('mweb.createPod.aiMonitoringNote')}
            </Text>
            <Text fontSize={12} color="rgba(255,255,255,0.72)" textAlign="center">
              {t('mweb.createPod.aiMonitoringHold')}
            </Text>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
