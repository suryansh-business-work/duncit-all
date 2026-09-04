import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import type { AutoPodLabels, AutoPodRow } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  labels: AutoPodLabels;
  onPress: () => void;
  testID: string;
}

/**
 * "View Potential Earnings" — the one control that opens a card's calculator,
 * sitting under the card's details so it reads as part of the same block.
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodEarningsButton` (rule 27).
 */
export function AutoPodEarningsButton({ labels, onPress, testID }: Readonly<Props>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={labels.viewEarningsCta}
      onPress={onPress}
      alignItems="center"
      gap={6}
      paddingVertical={6}
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name="insights" size={14} color={primary} />
      <Text fontSize={12.5} fontWeight="700" color={primary}>
        {labels.viewEarningsCta}
      </Text>
    </XStack>
  );
}

/**
 * The queue's `renderEarningsAction` for a whole screen. Every partner screen
 * draws the same control on every row, so the row-to-button mapping — and the
 * testID it carries — is written once here rather than inline per screen.
 */
export function autoPodEarningsRenderer(labels: AutoPodLabels, open: (row: AutoPodRow) => void) {
  return function renderEarningsAction(row: AutoPodRow) {
    return (
      <AutoPodEarningsButton
        labels={labels}
        onPress={() => open(row)}
        testID={`auto-pod-view-earnings-${row.id}`}
      />
    );
  };
}
