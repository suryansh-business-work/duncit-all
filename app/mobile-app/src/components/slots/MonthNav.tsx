import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  title: string;
  canGoBack: boolean;
  canGoNext: boolean;
  /** -1 for the previous month, 1 for the next. */
  onStep: (delta: number) => void;
  labels: Readonly<{ previousMonth: string; nextMonth: string }>;
  /** The arrows' test ids are `${testIDPrefix}-prev` / `-next`. */
  testIDPrefix: string;
}

interface ArrowProps {
  testID: string;
  label: string;
  enabled: boolean;
  icon: 'chevron-left' | 'chevron-right';
  onPress: () => void;
}

function MonthArrow({ testID, label, enabled, icon, onPress }: Readonly<ArrowProps>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={!enabled}
      onPress={() => {
        if (enabled) onPress();
      }}
      width={40}
      height={40}
      borderRadius={20}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$soft"
      opacity={enabled ? 1 : 0.3}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={22} color={ink} />
    </XStack>
  );
}

/** The month title between previous / next arrows over a hand-drawn month
 * grid — the slot picker's and the recurring pod calendar's. */
export function MonthNav({
  title,
  canGoBack,
  canGoNext,
  onStep,
  labels,
  testIDPrefix,
}: Readonly<Props>) {
  return (
    <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={4}>
      <MonthArrow
        testID={`${testIDPrefix}-prev`}
        label={labels.previousMonth}
        enabled={canGoBack}
        icon="chevron-left"
        onPress={() => onStep(-1)}
      />
      <Text fontSize={15} fontWeight="600" color="$color">
        {title}
      </Text>
      <MonthArrow
        testID={`${testIDPrefix}-next`}
        label={labels.nextMonth}
        enabled={canGoNext}
        icon="chevron-right"
        onPress={() => onStep(1)}
      />
    </XStack>
  );
}
