import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  title: string;
  body: string;
  /** 1-based position, e.g. "3 / 7". */
  position: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
}

/**
 * The tooltip body for a native tour step. Mirrors the four controls mWeb's
 * Joyride shows — Previous, Next, Skip, and Finish on the last step — so the two
 * platforms differ in chrome but not in what a user can do.
 */
export function TourCard({
  title,
  body,
  position,
  total,
  isFirst,
  isLast,
  onPrevious,
  onNext,
  onSkip,
}: Readonly<Props>) {
  const { muted, onPrimary } = useThemeColors();

  return (
    <YStack
      testID="tour-card"
      gap={8}
      padding={16}
      borderRadius={14}
      backgroundColor="$background"
      maxWidth={300}
    >
      <Text fontSize={15} fontWeight="900" color="$color">
        {title}
      </Text>
      <Text fontSize={13} color="$muted">
        {body}
      </Text>
      <Text fontSize={11} fontWeight="700" color={muted}>
        {position} / {total}
      </Text>
      <XStack gap={8} alignItems="center" justifyContent="flex-end" paddingTop={4}>
        <XStack
          testID="tour-skip"
          role="button"
          aria-label="Skip tour"
          onPress={onSkip}
          paddingVertical={8}
          paddingHorizontal={10}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text fontSize={12.5} fontWeight="800" color="$muted">
            Skip
          </Text>
        </XStack>
        {isFirst ? null : (
          <XStack
            testID="tour-previous"
            role="button"
            aria-label="Previous step"
            onPress={onPrevious}
            paddingVertical={8}
            paddingHorizontal={10}
            borderRadius={10}
            borderWidth={1}
            borderColor="$borderColor"
            pressStyle={{ opacity: 0.7 }}
          >
            <Text fontSize={12.5} fontWeight="800" color="$color">
              Previous
            </Text>
          </XStack>
        )}
        <XStack
          testID="tour-next"
          role="button"
          aria-label={isLast ? 'Finish tour' : 'Next step'}
          onPress={onNext}
          paddingVertical={8}
          paddingHorizontal={12}
          borderRadius={10}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={12.5} fontWeight="900" color={onPrimary}>
            {isLast ? 'Finish' : 'Next'}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
