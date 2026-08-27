import type { LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface SurveyFooterProps {
  count: number;
  total: number;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  /** Reports the footer's rendered height so the scroll behind it can reserve
   * exactly that much room — its height varies with the device's safe-area
   * inset, so a constant is wrong on some phones. */
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Sticky bottom action bar. Rendered OUTSIDE the ScrollView and absolutely
 * positioned, with the scroll content padded to clear it.
 */
export function SurveyFooter({
  count,
  total,
  saving,
  canSubmit,
  onSubmit,
  onLayout,
}: Readonly<SurveyFooterProps>) {
  const insets = useSafeAreaInsets();
  return (
    <YStack
      testID="survey-footer"
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      onLayout={onLayout}
      borderTopWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      paddingHorizontal={16}
      paddingTop={8}
      paddingBottom={insets.bottom + 8}
    >
      <XStack
        alignItems="center"
        gap={12}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
        paddingHorizontal={16}
        paddingVertical={12}
      >
        <YStack flex={1}>
          <Text fontSize={12} color="$muted">
            Selected
          </Text>
          <Text fontSize={16} fontWeight="600" color="$color">
            {count}
            <Text fontWeight="600" color="$muted">
              {' '}
              / {total}
            </Text>
          </Text>
        </YStack>
        <XStack
          testID="survey-submit"
          role="button"
          aria-disabled={!canSubmit}
          aria-busy={saving}
          disabled={!canSubmit}
          onPress={() => {
            if (canSubmit) onSubmit();
          }}
          borderRadius={10}
          backgroundColor="$primary"
          paddingHorizontal={20}
          paddingVertical={12}
          opacity={canSubmit ? 1 : 0.5}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={16} fontWeight="600" color="$onPrimary">
            {saving ? 'Saving…' : 'Find my crew'}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
