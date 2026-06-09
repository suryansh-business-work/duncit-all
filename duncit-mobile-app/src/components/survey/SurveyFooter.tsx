import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

export interface SurveyFooterProps {
  count: number;
  total: number;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
}

/**
 * Sticky bottom action bar. Rendered OUTSIDE the ScrollView and absolutely
 * positioned, with the scroll content padded to clear it.
 */
export function SurveyFooter({ count, total, saving, canSubmit, onSubmit }: Readonly<SurveyFooterProps>) {
  const insets = useSafeAreaInsets();
  return (
    <YStack
      testID="survey-footer"
      position="absolute"
      left={0}
      right={0}
      bottom={0}
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
          <Text fontSize={16} fontWeight="800" color="$color">
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
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={16} fontWeight="800" color="$onPrimary">
            {saving ? 'Saving…' : 'Find my crew'}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
