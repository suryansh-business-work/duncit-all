import type { LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { BUTTON_SIZES, PRESS_STYLE } from '@duncit/buttons-native';

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
 * positioned, with the scroll content padded to clear it: the count on the
 * left, the green pill CTA on the right.
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
      paddingTop={12}
      paddingBottom={insets.bottom + 12}
    >
      <XStack alignItems="center" gap={16}>
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
          minWidth={160}
          height={BUTTON_SIZES.lg.height}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          paddingHorizontal={BUTTON_SIZES.lg.paddingHorizontal}
          opacity={canSubmit ? 1 : 0.5}
          pressStyle={PRESS_STYLE.solid}
        >
          <Text fontSize={BUTTON_SIZES.lg.fontSize} fontWeight="600" color="$onPrimary">
            {saving ? 'Saving…' : 'Find my crew'}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
