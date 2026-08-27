import { Text, XStack, YStack } from 'tamagui';
import type { TooltipProps } from 'rn-tourguide';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useToursStore } from '@/stores/tours.store';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * The tooltip for a native tour step.
 *
 * rn-tourguide's own tooltip is a hard-coded near-white card, which is
 * unreadable on the dark theme — this one is a Tamagui surface, so it takes its
 * background, text, border and accent from whichever theme is active. It
 * mirrors the four controls mWeb's Joyride shows (Previous, Next, Skip, and
 * Finish on the last step) so the two platforms differ in chrome but not in
 * what a user can do.
 *
 * A zone only carries its body copy, so the title and the progress count are
 * read back from the frozen step list the runner locked in — the same
 * @duncit/tours entry mWeb renders.
 */
export function TourCard({
  isFirstStep,
  isLastStep,
  currentStep,
  handleNext,
  handlePrev,
  handleStop,
}: Readonly<TooltipProps>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const steps = useToursStore((s) => s.activeSteps);

  // `order` is the zone number the anchor registered with, and zones are 1-based.
  const position = currentStep.order;
  const step = steps[position - 1];
  // The overlay outlives the store by a frame when a tour is finished from the
  // card itself; there is nothing to say in that frame.
  if (!step) return null;

  return (
    <YStack
      testID="tour-card"
      width="100%"
      gap={8}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={16} fontWeight="700" color="$color">
        {step.title}
      </Text>
      <Text fontSize={13.5} lineHeight={19} color="$muted">
        {step.body}
      </Text>
      <XStack alignItems="center" justifyContent="space-between" paddingTop={4}>
        <Text testID="tour-progress" fontSize={11.5} fontWeight="700" color="$muted">
          {position} / {steps.length}
        </Text>
        <XStack gap={8} alignItems="center">
          <XStack
            testID="tour-skip"
            role="button"
            aria-label={t('mweb.tours.skipTour')}
            onPress={handleStop}
            paddingVertical={8}
            paddingHorizontal={10}
            pressStyle={PRESS_STYLE.row}
          >
            <Text fontSize={12.5} fontWeight="600" color="$muted">
              Skip
            </Text>
          </XStack>
          {isFirstStep ? null : (
            <XStack
              testID="tour-previous"
              role="button"
              aria-label={t('mweb.tours.previousStep')}
              onPress={handlePrev}
              paddingVertical={8}
              paddingHorizontal={12}
              borderRadius={10}
              borderWidth={1}
              borderColor="$borderColor"
              pressStyle={PRESS_STYLE.row}
            >
              <Text fontSize={12.5} fontWeight="600" color="$color">
                Previous
              </Text>
            </XStack>
          )}
          <XStack
            testID="tour-next"
            role="button"
            aria-label={isLastStep ? 'Finish tour' : 'Next step'}
            onPress={isLastStep ? handleStop : handleNext}
            paddingVertical={8}
            paddingHorizontal={14}
            borderRadius={10}
            backgroundColor="$primary"
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={12.5} fontWeight="700" color={onPrimary}>
              {isLastStep ? 'Finish' : 'Next'}
            </Text>
          </XStack>
        </XStack>
      </XStack>
    </YStack>
  );
}
