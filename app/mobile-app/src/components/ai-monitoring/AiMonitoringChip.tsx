import { useState } from 'react';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AI_MONITOR_GRADIENT } from '@duncit/utils';
import { useAiMonitoringConfig } from '@/hooks/useAiMonitoringConfig';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AiMonitoringDialog } from './AiMonitoringDialog';
import { useAiSweep, useAiTwinkle } from './useAiTwinkle';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  testID?: string;
}

/**
 * The AI Monitoring notice, for the native app.
 *
 * Sits beside any control that accepts an image or a file. The Tamagui twin of
 * @duncit/ai-monitoring/mui's `AiMonitoringChip`: same admin-managed copy, same
 * fallback, same behaviour when an operator turns the notice off — only the
 * view is written twice, because RN cannot render MUI (rule 40).
 *
 * It moves for the reason the web chip does: it is a disclosure beside a field
 * a person is busy filling in, so a band of the AI gradient crosses it and the
 * bot's eye turns, and it is read before the upload rather than after. The
 * sheen is a clipped gradient sliding across an absolute layer — RN has no
 * pseudo-element to hang it on.
 */
export function AiMonitoringChip({ testID = 'ai-monitoring-chip' }: Readonly<Props>) {
  const { visible, copy } = useAiMonitoringConfig();
  const { primary } = useThemeColors();
  const [open, setOpen] = useState(false);
  const sheenStyle = useAiSweep(visible, '-140%', '240%');
  const twinkleStyle = useAiTwinkle(visible);

  if (!visible) return null;

  return (
    <>
      <XStack
        testID={testID}
        role="button"
        aria-label={copy.title}
        onPress={() => setOpen(true)}
        pressStyle={PRESS_STYLE.control}
        alignItems="center"
        gap={5}
        borderRadius={999}
        borderWidth={1}
        borderColor="$primary"
        paddingHorizontal={10}
        paddingVertical={5}
        overflow="hidden"
      >
        <Animated.View
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, width: '45%', opacity: 0.28 },
            sheenStyle,
          ]}
        >
          <LinearGradient
            colors={AI_MONITOR_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
        <Animated.View style={twinkleStyle}>
          <MaterialIcons name="smart-toy" size={13} color={primary} />
        </Animated.View>
        <Text fontSize={11} fontWeight="700" color="$primary">
          {copy.chipLabel}
        </Text>
      </XStack>
      <AiMonitoringDialog open={open} onClose={() => setOpen(false)} copy={copy} />
    </>
  );
}
