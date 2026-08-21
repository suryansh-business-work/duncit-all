import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useAiMonitoringConfig } from '@/hooks/useAiMonitoringConfig';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AiMonitoringDialog } from './AiMonitoringDialog';

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
 */
export function AiMonitoringChip({ testID = 'ai-monitoring-chip' }: Readonly<Props>) {
  const { visible, copy } = useAiMonitoringConfig();
  const { primary } = useThemeColors();
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <XStack
        testID={testID}
        role="button"
        aria-label={copy.title}
        onPress={() => setOpen(true)}
        pressStyle={{ opacity: 0.85 }}
        alignItems="center"
        gap={5}
        borderRadius={999}
        borderWidth={1}
        borderColor="$primary"
        paddingHorizontal={10}
        paddingVertical={5}
      >
        <MaterialIcons name="smart-toy" size={13} color={primary} />
        <Text fontSize={11} fontWeight="700" color="$primary">
          {copy.chipLabel}
        </Text>
      </XStack>
      <AiMonitoringDialog open={open} onClose={() => setOpen(false)} copy={copy} />
    </>
  );
}
